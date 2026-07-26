import { spawn } from 'child_process';
import { EventEmitter } from 'events';

import { ChessEngine, parseBestMove } from '../src/main/UCCI';

jest.mock('child_process');

const mockedSpawn = jest.mocked(spawn);

type CommandHandler = (command: string, proc: MockProcess) => void;

class MockProcess extends EventEmitter {
  readonly stdout = new EventEmitter();
  readonly commands: string[] = [];
  killed = false;
  readonly stdin = {
    destroyed: false,
    writable: true,
    write: jest.fn((text: string, callback?: (error?: Error | null) => void) => {
      const command = text.trim();
      this.commands.push(command);
      this.onCommand(command, this);
      callback?.(null);
      return true;
    }),
  };
  readonly kill = jest.fn(() => {
    this.killed = true;
    return true;
  });
  readonly unref = jest.fn();

  constructor(private readonly onCommand: CommandHandler) {
    super();
  }

  output(text: string): void {
    this.stdout.emit('data', Buffer.from(text));
  }
}

const respondToInitialization: CommandHandler = (command, proc) => {
  if (command === 'uci') {
    proc.output(
      'id name MockEngine\noption name Threads type spin\noption name Hash type spin\nuciok\n'
    );
  } else if (command === 'isready') {
    proc.output('readyok\n');
  }
};

describe('ChessEngine lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(['bestmove (none)', 'bestmove 0000', 'nobestmove'])(
    'parses %s as no legal move',
    (line) => {
      expect(parseBestMove(`${line}\n`).bestmove).toBeNull();
    }
  );

  it('rejects a normal command timeout', async () => {
    jest.useFakeTimers();
    const first = new MockProcess((command, proc) => {
      if (
        command !== 'isready' ||
        proc.commands.filter((item) => item === 'isready').length === 1
      ) {
        respondToInitialization(command, proc);
      }
    });
    const recovered = new MockProcess(respondToInitialization);
    mockedSpawn.mockReturnValueOnce(first as never).mockReturnValueOnce(recovered as never);
    const engine = new ChessEngine('mock.exe', 'Mock', 'uci', 1, 16, false, {
      command: 20,
      initialization: 20,
    });

    await engine.initEngine();
    const command = engine.sendAsync('isready');
    const rejection = expect(command).rejects.toThrow('引擎命令超时');
    await jest.advanceTimersByTimeAsync(21);

    await rejection;
    await engine.quit();
  });

  it('rejects an asynchronous spawn error', async () => {
    const proc = new MockProcess(() => undefined);
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('missing.exe', 'Mock', 'uci');

    const init = engine.initEngine();
    proc.emit('error', new Error('ENOENT'));

    await expect(init).rejects.toThrow('ENOENT');
    await engine.quit();
  });

  it('rejects a synchronous spawn failure', async () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('spawn failed');
    });
    const engine = new ChessEngine('missing.exe', 'Mock', 'uci');

    await expect(engine.initEngine()).rejects.toThrow('无法启动引擎');
  });

  it('rejects stdin write failures and recovers the process', async () => {
    const first = new MockProcess(respondToInitialization);
    const recovered = new MockProcess(respondToInitialization);
    mockedSpawn.mockReturnValueOnce(first as never).mockReturnValueOnce(recovered as never);
    const engine = new ChessEngine('mock.exe', 'Mock', 'uci');

    await engine.initEngine();
    first.stdin.write.mockImplementationOnce(
      (_text: string, callback?: (error?: Error | null) => void) => {
        callback?.(new Error('broken pipe'));
        return false;
      }
    );

    await expect(engine.infoAndMove('mock-fen', { difficulty: null, maxTime: 20 })).rejects.toThrow(
      'broken pipe'
    );
    await engine.initEngine();
    expect(recovered.commands).toContain('isready');
    await engine.quit();
  });

  it('rejects interrupted work, restarts, and reapplies configuration', async () => {
    const first = new MockProcess((command, proc) => {
      respondToInitialization(command, proc);
      if (command.startsWith('go ')) proc.emit('exit', 7, null);
    });
    const second = new MockProcess((command, proc) => {
      respondToInitialization(command, proc);
      if (command.startsWith('go ')) proc.output('bestmove b0c2\n');
    });
    mockedSpawn.mockReturnValueOnce(first as never).mockReturnValueOnce(second as never);
    const engine = new ChessEngine('mock.exe', 'Mock', 'uci', 2, 32);

    await engine.initEngine();
    await expect(engine.infoAndMove('mock-fen', { difficulty: null, maxTime: 50 })).rejects.toThrow(
      '引擎意外退出'
    );
    const result = await engine.infoAndMove('mock-fen', { difficulty: null, maxTime: 50 });

    expect(result.bestmove).toBe('b0c2');
    expect(second.commands).toEqual(
      expect.arrayContaining([
        'uci',
        'setoption name Threads value 2',
        'setoption name Hash value 32',
        'isready',
      ])
    );
    await engine.quit();
  });

  it('consumes a timed-out search bestmove before starting the next search', async () => {
    jest.useFakeTimers();
    let searches = 0;
    const proc = new MockProcess((command, currentProc) => {
      respondToInitialization(command, currentProc);
      if (command.startsWith('go ')) {
        searches++;
        if (searches === 2) currentProc.output('bestmove b0c2\n');
      } else if (command === 'stop') {
        currentProc.output('bestmove a0a1\n');
      }
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('mock.exe', 'Mock', 'uci', 1, 16, false, {
      searchGrace: 0,
      stop: 20,
    });

    await engine.initEngine();
    const first = engine.infoAndMove('first', { difficulty: null, maxTime: 20 });
    const rejection = expect(first).rejects.toThrow('引擎搜索超时');
    await jest.advanceTimersByTimeAsync(21);
    await rejection;

    const second = await engine.infoAndMove('second', { difficulty: null, maxTime: 20 });
    expect(second.bestmove).toBe('b0c2');
    expect(proc.commands.filter((command) => command === 'stop')).toHaveLength(1);
    expect(proc.commands.indexOf('stop')).toBeLessThan(proc.commands.lastIndexOf('go movetime 20'));
    await engine.quit();
  });

  it('stops a bounded UCCI ponder search and returns its bestmove', async () => {
    jest.useFakeTimers();
    const proc = new MockProcess((command, currentProc) => {
      if (command === 'ucci') currentProc.output('id name MockUCCI\nucciok\n');
      else if (command === 'isready') currentProc.output('readyok\n');
      else if (command === 'stop') currentProc.output('bestmove h2e2\n');
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('mock.exe', 'Mock', 'ucci');

    await engine.initEngine();
    const search = engine.infoAndMove('mock-fen', { difficulty: null, maxTime: 20 });
    await jest.advanceTimersByTimeAsync(20);

    await expect(search).resolves.toMatchObject({ bestmove: 'h2e2' });
    await jest.advanceTimersByTimeAsync(2001);
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    expect(proc.kill).not.toHaveBeenCalled();
    await engine.quit();
  });

  it('does not install a stale stopAnalysis timer after an immediate bestmove', async () => {
    jest.useFakeTimers();
    const proc = new MockProcess((command, currentProc) => {
      respondToInitialization(command, currentProc);
      if (command === 'stop') currentProc.output('bestmove h2e2\n');
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('mock.exe', 'Mock', 'uci');

    await engine.initEngine();
    await engine.analyzePosition('mock-fen', jest.fn());
    const result = await engine.stopAnalysis();
    expect(result.bestmove).toBe('h2e2');

    await jest.advanceTimersByTimeAsync(2001);
    expect(mockedSpawn).toHaveBeenCalledTimes(1);
    expect(proc.kill).not.toHaveBeenCalled();
    await engine.quit();
  });

  it('applies and deduplicates native Skill Level settings', async () => {
    const proc = new MockProcess((command, currentProc) => {
      if (command === 'uci') {
        currentProc.output(
          'id name GGChess\noption name Skill Level type spin default 20 min 0 max 20\nuciok\n'
        );
      } else if (command === 'isready') {
        currentProc.output('readyok\n');
      } else if (command.startsWith('go ')) {
        currentProc.output('bestmove b0c2\n');
      }
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('mock.exe', 'GG', 'uci');

    await engine.infoAndMove('first', { difficulty: 1, maxTime: 3000 });
    await engine.infoAndMove('second', { difficulty: 1, maxTime: 3000 });
    await engine.infoAndMove('third', { difficulty: 2, maxTime: 3000 });
    await engine.infoAndMove('fourth', { difficulty: null, maxTime: 3000 });

    expect(
      proc.commands.filter((command) => command === 'setoption name Skill Level value 0')
    ).toHaveLength(1);
    expect(
      proc.commands.filter((command) => command === 'setoption name Skill Level value 10')
    ).toHaveLength(1);
    expect(
      proc.commands.filter((command) => command === 'setoption name Skill Level value 20')
    ).toHaveLength(1);
    await engine.quit();
  });

  it('uses node-limited searches for Pikafish difficulties', async () => {
    const proc = new MockProcess((command, currentProc) => {
      if (command === 'uci') currentProc.output('id name Pikafish 2026\nuciok\n');
      else if (command === 'isready') currentProc.output('readyok\n');
      else if (command.startsWith('go nodes ')) {
        currentProc.output('info depth 8 nodes 10000 pv b0c2\nbestmove b0c2\n');
      }
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('pikafish.exe', 'Pikafish', 'uci');

    const result = await engine.infoAndMove('mock-fen', { difficulty: 1, maxTime: 3000 });

    expect(result.bestmove).toBe('b0c2');
    expect(proc.commands).toContain('go nodes 10000');
    await engine.quit();
  });

  it('waits for engine identity and options after a premature uciok', async () => {
    const proc = new MockProcess((command, currentProc) => {
      if (command === 'uci') {
        currentProc.output('uciok\n');
        currentProc.output(
          'id name GGChess\noption name Skill Level type spin default 20 min 0 max 20\nuciok\n'
        );
      } else if (command === 'isready') {
        currentProc.output('readyok\n');
      } else if (command.startsWith('go ')) {
        currentProc.output('bestmove b0c2\n');
      }
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('gg.exe', 'GG', 'uci');

    await engine.infoAndMove('mock-fen', { difficulty: 1, maxTime: 3000 });

    expect(proc.commands).toContain('setoption name Skill Level value 0');
    await engine.quit();
  });

  it('stops a Pikafish node search at the wall-clock safety limit', async () => {
    jest.useFakeTimers();
    const proc = new MockProcess((command, currentProc) => {
      if (command === 'uci') currentProc.output('id name Pikafish 2026\nuciok\n');
      else if (command === 'isready') currentProc.output('readyok\n');
      else if (command === 'stop') currentProc.output('bestmove b0c2\n');
    });
    mockedSpawn.mockReturnValue(proc as never);
    const engine = new ChessEngine('pikafish.exe', 'Pikafish', 'uci');

    const search = engine.infoAndMove('mock-fen', { difficulty: 3, maxTime: 20 });
    await jest.advanceTimersByTimeAsync(20);

    await expect(search).resolves.toMatchObject({ bestmove: 'b0c2' });
    expect(proc.commands).toContain('go nodes 1000000');
    expect(proc.commands).toContain('stop');
    await engine.quit();
  });
});
