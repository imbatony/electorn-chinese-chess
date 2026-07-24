import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

import { Info, InfoAndMove, OnInfoCallback } from './engine-types';

const UCCI = 'ucci';
const UCI = 'uci';
const DEFAULT_HASH_SIZE = 128;
const DEFAULT_THREAD_COUNT = 4;

export interface QueryMoveOption {
  difficulty: number | null;
  maxTime: number;
}

export interface EngineTimeouts {
  initialization: number;
  command: number;
  searchGrace: number;
  stop: number;
}

type ResponseKind = 'protocol' | 'ready' | 'bestmove';

interface CurrentCommand {
  command: string;
  expected: ResponseKind;
  output: string[];
  resolve: (value: string) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout> | null;
  scheduledStop: ReturnType<typeof setTimeout> | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
  timedOut: boolean;
  onInfo?: OnInfoCallback;
}

const DEFAULT_TIMEOUTS: EngineTimeouts = {
  initialization: 5000,
  command: 3000,
  searchGrace: 500,
  stop: 2000,
};

/**
 * 解析 UCI/UCCI info 行。
 */
export function parseInfoLine(line: string): Info | null {
  if (!line || !line.trimStart().startsWith('info')) return null;

  const tokens = line.trim().split(/\s+/);
  let i = tokens.indexOf('info') + 1;
  if (i === 0) return null;

  let depth: number | undefined;
  let seldepth: number | undefined;
  let score: number | undefined;
  let scoreType: 'cp' | 'mate' = 'cp';
  let nodes: number | undefined;
  let nps: number | undefined;
  let time: number | undefined;
  let multipv: number | undefined;
  let pv: string[] | undefined;

  while (i < tokens.length) {
    switch (tokens[i]) {
      case 'depth':
        depth = parseInt(tokens[++i], 10);
        break;
      case 'seldepth':
        seldepth = parseInt(tokens[++i], 10);
        break;
      case 'score':
        if (tokens[i + 1] === 'cp' || tokens[i + 1] === 'mate') {
          scoreType = tokens[++i] as 'cp' | 'mate';
        }
        score = parseInt(tokens[++i], 10);
        break;
      case 'nodes':
        nodes = parseInt(tokens[++i], 10);
        break;
      case 'nps':
        nps = parseInt(tokens[++i], 10);
        break;
      case 'time':
        time = parseInt(tokens[++i], 10);
        break;
      case 'multipv':
        multipv = parseInt(tokens[++i], 10);
        break;
      case 'pv':
        pv = tokens.slice(i + 1);
        i = tokens.length;
        break;
    }
    i++;
  }

  if (depth === undefined) return null;
  return {
    depth,
    score: score ?? 0,
    scoreType,
    pv: pv ?? [],
    ...(seldepth === undefined ? {} : { seldepth }),
    ...(nodes === undefined ? {} : { nodes }),
    ...(nps === undefined ? {} : { nps }),
    ...(time === undefined ? {} : { time }),
    ...(multipv === undefined ? {} : { multipv }),
  };
}

export function parseBestMove(output: string): { bestmove: string | null; ponder?: string } {
  for (const rawLine of output.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === 'nobestmove') return { bestmove: null };
    if (!line.startsWith('bestmove')) continue;
    const tokens = line.split(/\s+/);
    const move = tokens[1];
    const ponderIndex = tokens.indexOf('ponder');
    return {
      bestmove: !move || move === '(none)' || move === '0000' ? null : move,
      ...(ponderIndex >= 0 && tokens[ponderIndex + 1] ? { ponder: tokens[ponderIndex + 1] } : {}),
    };
  }
  throw new Error('引擎响应中缺少 bestmove');
}

/**
 * 串行 UCI/UCCI 引擎客户端。任一时刻只允许一个有响应的命令在途。
 */
export class ChessEngine {
  public name: string;

  private readonly location: string;
  private readonly type: 'ucci' | 'uci';
  private readonly thread: number;
  private readonly hashSize: number;
  private readonly minDiff: number;
  private readonly maxDiff: number;
  private readonly timeouts: EngineTimeouts;
  private process: ChildProcessWithoutNullStreams | null = null;
  private current: CurrentCommand | null = null;
  private stdoutBuffer = '';
  private ready = false;
  private closing = false;
  private initializing = false;
  private initializedOnce = false;
  private recovery: Promise<string> | null = null;
  private engineDisplayName = '';
  private hasThreadOption = false;
  private hasHashSizeOption = false;
  private analysisPromise: Promise<string> | null = null;
  private analysisPvList: Info[] = [];
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    location: string,
    name: string,
    type: 'ucci' | 'uci' = UCCI,
    thread: number = DEFAULT_THREAD_COUNT,
    hashSize: number = DEFAULT_HASH_SIZE,
    minDiff = 1,
    maxDiff = 3,
    _useCliArgs = false,
    timeouts: Partial<EngineTimeouts> = {}
  ) {
    this.location = location;
    this.name = name;
    this.type = type;
    this.thread = thread;
    this.hashSize = hashSize;
    this.minDiff = minDiff;
    this.maxDiff = maxDiff;
    this.timeouts = { ...DEFAULT_TIMEOUTS, ...timeouts };
  }

  getQueyForTime(time: number): string {
    return this.type === UCCI
      ? `go ponder time ${time} movestogo 1 opptime ${time} oppmovestogo 1`
      : `go movetime ${time}`;
  }

  public async initEngine(): Promise<string> {
    if (this.ready) return this.engineDisplayName;
    if (this.recovery) return this.recovery;
    this.recovery = this.initializeProcess();
    void this.recovery.catch((): void => {});
    try {
      return await this.recovery;
    } finally {
      this.recovery = null;
    }
  }

  private async initializeProcess(): Promise<string> {
    this.initializing = true;
    this.ready = false;
    this.closing = false;
    this.hasThreadOption = false;
    this.hasHashSizeOption = false;
    try {
      this.startProcess();
      const engineInfo = await this.issueCommand(
        this.type,
        'protocol',
        this.timeouts.initialization
      );
      this.readEngineOptions(engineInfo);
      if (this.hasThreadOption) {
        await this.writeOnly(
          this.type === UCCI
            ? `setoption threads ${this.thread}`
            : `setoption name Threads value ${this.thread}`
        );
      }
      if (this.hasHashSizeOption) {
        await this.writeOnly(
          this.type === UCCI
            ? `setoption hashsize ${this.hashSize}`
            : `setoption name Hash value ${this.hashSize}`
        );
      }
      await this.issueCommand('isready', 'ready', this.timeouts.initialization);
      this.ready = true;
      this.initializedOnce = true;
      return engineInfo;
    } catch (error) {
      this.disposeProcess();
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  private startProcess(): void {
    let child: ChildProcessWithoutNullStreams;
    try {
      child = spawn(this.location, []);
    } catch (error) {
      throw new Error(`无法启动引擎: ${this.errorMessage(error)}`);
    }
    this.process = child;
    this.stdoutBuffer = '';
    child.stdout.on('data', this.onStdout);
    child.on('error', this.onProcessError);
    child.on('exit', this.onProcessExit);
  }

  private readonly onStdout = (data: Buffer): void => {
    this.stdoutBuffer += data.toString('utf8');
    const lines = this.stdoutBuffer.split(/\r?\n/);
    this.stdoutBuffer = lines.pop() ?? '';
    for (const line of lines) this.handleLine(line.trim());
  };

  private handleLine(line: string): void {
    const command = this.current;
    if (!command || !line) return;
    command.output.push(line);
    if (line.startsWith('info')) {
      const info = parseInfoLine(line);
      if (info) command.onInfo?.(info);
    }

    const complete =
      (command.expected === 'protocol' && line === (this.type === UCCI ? 'ucciok' : 'uciok')) ||
      (command.expected === 'ready' && line === 'readyok') ||
      (command.expected === 'bestmove' && (line.startsWith('bestmove') || line === 'nobestmove'));
    if (!complete) return;

    const output = command.output.join('\n');
    if (command.timedOut) {
      this.rejectCurrent(new Error(`引擎搜索超时: ${command.command}`), false);
    } else {
      this.resolveCurrent(output);
    }
  }

  private readonly onProcessError = (error: Error): void => {
    this.failProcess(new Error(`引擎进程错误: ${error.message}`));
  };

  private readonly onProcessExit = (code: number | null, signal: NodeJS.Signals | null): void => {
    if (this.closing) return;
    this.failProcess(
      new Error(
        `引擎意外退出${code === null ? '' : ` (code ${code})`}${signal ? ` (${signal})` : ''}`
      )
    );
  };

  private failProcess(error: Error): void {
    this.ready = false;
    this.rejectCurrent(error, false);
    this.disposeProcess();
    if (this.initializedOnce && !this.initializing && !this.closing && !this.recovery) {
      this.recovery = this.initializeProcess();
      void this.recovery
        .catch((): void => {})
        .finally(() => {
          this.recovery = null;
        });
    }
  }

  private readEngineOptions(output: string): void {
    for (const line of output.split(/\r?\n/)) {
      if (line.startsWith('id name ')) this.engineDisplayName = line.slice(8).trim();
      if (!line.startsWith('option')) continue;
      if (this.type === UCCI) {
        this.hasThreadOption ||= /\bthreads\b/i.test(line);
        this.hasHashSizeOption ||= /\bhashsize\b/i.test(line);
      } else {
        this.hasThreadOption ||= /\bname\s+Threads\b/.test(line);
        this.hasHashSizeOption ||= /\bname\s+Hash\b/.test(line);
      }
    }
  }

  private async ensureReady(): Promise<void> {
    if (!this.ready) await this.initEngine();
    if (!this.ready) throw new Error('引擎尚未就绪');
  }

  private issueCommand(
    command: string,
    expected: ResponseKind,
    timeoutMs: number | null,
    onInfo?: OnInfoCallback,
    stopAfterMs?: number
  ): Promise<string> {
    if (this.current) return Promise.reject(new Error('引擎正忙'));
    const proc = this.process;
    if (!proc) return Promise.reject(new Error('引擎进程未启动'));

    this.stdoutBuffer = '';
    return new Promise<string>((resolve, reject) => {
      const current: CurrentCommand = {
        command,
        expected,
        output: [],
        resolve,
        reject,
        timeout: null,
        scheduledStop: null,
        stopTimer: null,
        timedOut: false,
        onInfo,
      };
      this.current = current;
      if (timeoutMs !== null) {
        current.timeout = setTimeout(() => {
          if (expected === 'bestmove') {
            this.timeoutSearch(current);
          } else {
            const error = new Error(`引擎命令超时: ${command}`);
            this.rejectCurrent(error, false);
            this.failProcess(error);
          }
        }, timeoutMs);
      }
      if (stopAfterMs !== undefined) {
        current.scheduledStop = setTimeout(() => this.stopSearch(current, false), stopAfterMs);
      }
      this.write(command).catch((error) => this.failProcess(error));
    });
  }

  private async writeOnly(command: string): Promise<string> {
    if (this.current) throw new Error('引擎正忙');
    try {
      await this.write(command);
      return '';
    } catch (error) {
      this.failProcess(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private write(command: string): Promise<void> {
    const proc = this.process;
    if (!proc || proc.stdin.destroyed || !proc.stdin.writable) {
      return Promise.reject(new Error('引擎标准输入不可写'));
    }
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`写入引擎超时: ${command}`)),
        this.timeouts.command
      );
      try {
        proc.stdin.write(`${command}\n`, (error) => {
          clearTimeout(timer);
          if (error) reject(new Error(`写入引擎失败: ${error.message}`));
          else resolve();
        });
      } catch (error) {
        clearTimeout(timer);
        reject(new Error(`写入引擎失败: ${this.errorMessage(error)}`));
      }
    });
  }

  private timeoutSearch(command: CurrentCommand): void {
    if (this.current !== command || command.timedOut) return;
    this.stopSearch(command, true);
  }

  private stopSearch(command: CurrentCommand, timedOut: boolean): void {
    if (this.current !== command || command.stopTimer) return;
    command.timedOut = timedOut;
    this.clearTimer(command.timeout);
    this.clearTimer(command.scheduledStop);
    command.timeout = null;
    command.scheduledStop = null;
    this.write('stop')
      .then(() => {
        if (this.current !== command || command.stopTimer) return;
        command.stopTimer = setTimeout(() => {
          const error = new Error('停止引擎搜索超时');
          this.rejectCurrent(error, false);
          this.failProcess(error);
        }, this.timeouts.stop);
      })
      .catch((error) => this.failProcess(error));
  }

  private resolveCurrent(output: string): void {
    const command = this.current;
    if (!command) return;
    this.current = null;
    this.clearCommandTimers(command);
    this.stdoutBuffer = '';
    command.resolve(output);
  }

  private rejectCurrent(error: Error, restart: boolean): void {
    const command = this.current;
    if (command) {
      this.current = null;
      this.clearCommandTimers(command);
      this.stdoutBuffer = '';
      command.reject(error);
    }
    if (restart) this.failProcess(error);
  }

  private clearCommandTimers(command: CurrentCommand): void {
    this.clearTimer(command.timeout);
    this.clearTimer(command.scheduledStop);
    this.clearTimer(command.stopTimer);
    command.timeout = null;
    command.scheduledStop = null;
    command.stopTimer = null;
  }

  private clearTimer(timer: ReturnType<typeof setTimeout> | null): void {
    if (timer) clearTimeout(timer);
  }

  private disposeProcess(): void {
    const proc = this.process;
    this.process = null;
    this.stdoutBuffer = '';
    if (!proc) return;
    proc.stdout.removeListener('data', this.onStdout);
    proc.removeListener('error', this.onProcessError);
    proc.removeListener('exit', this.onProcessExit);
    if (!proc.killed) proc.kill();
    proc.unref();
  }

  public async sendAsync(command: string): Promise<string> {
    await this.ensureReady();
    if (command === 'isready') {
      return this.issueCommand(command, 'ready', this.timeouts.command);
    }
    if (command === UCI || command === UCCI) {
      return this.issueCommand(command, 'protocol', this.timeouts.command);
    }
    return this.writeOnly(command);
  }

  public async infoAndMove(
    fen: string,
    { difficulty, maxTime }: QueryMoveOption,
    onInfo?: OnInfoCallback
  ): Promise<InfoAndMove> {
    return this.runSerial(() => this.performInfoAndMove(fen, { difficulty, maxTime }, onInfo));
  }

  private async performInfoAndMove(
    fen: string,
    { difficulty, maxTime }: QueryMoveOption,
    onInfo?: OnInfoCallback
  ): Promise<InfoAndMove> {
    await this.ensureReady();
    if (this.type === UCI) await this.writeOnly('ucinewgame');
    await this.writeOnly(`position fen ${fen}`);

    let requestedTime = maxTime;
    if (difficulty !== null) {
      requestedTime = Math.min(this.maxDiff, Math.max(this.minDiff, difficulty)) * 1500;
    }
    const searchTime = Math.min(requestedTime, maxTime);
    const output = await this.issueCommand(
      this.getQueyForTime(searchTime),
      'bestmove',
      searchTime + this.timeouts.searchGrace,
      onInfo,
      this.type === UCCI ? searchTime : undefined
    );
    return this.buildSearchResult(output);
  }

  private runSerial<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      (): void => {},
      (): void => {}
    );
    return result;
  }

  private buildSearchResult(output: string, pvList?: Info[]): InfoAndMove {
    const infos =
      pvList ??
      output
        .split(/\r?\n/)
        .map(parseInfoLine)
        .filter((info): info is Info => info !== null);
    const move = parseBestMove(output);
    const lastInfo = infos[infos.length - 1];
    return {
      pvList: infos,
      bestmove: move.bestmove,
      ...(move.ponder ? { ponder: move.ponder } : {}),
      ...(lastInfo?.nodes === undefined ? {} : { nodes: lastInfo.nodes }),
      ...(lastInfo?.nps === undefined ? {} : { nps: lastInfo.nps }),
      ...(lastInfo?.time === undefined ? {} : { time: lastInfo.time }),
    };
  }

  public async analyzePosition(fen: string, onInfo: OnInfoCallback): Promise<void> {
    await this.ensureReady();
    if (this.analysisPromise || this.current) throw new Error('引擎正忙');
    await this.writeOnly(`position fen ${fen}`);
    this.analysisPvList = [];
    this.analysisPromise = this.issueCommand('go infinite', 'bestmove', null, (info) => {
      this.analysisPvList.push(info);
      onInfo(info);
    });
    void this.analysisPromise.catch((): void => {});
  }

  public async stopAnalysis(): Promise<InfoAndMove> {
    const promise = this.analysisPromise;
    const command = this.current;
    if (!promise || !command || command.command !== 'go infinite') {
      throw new Error('当前没有正在进行的分析');
    }
    this.clearTimer(command.timeout);
    command.timeout = null;
    await this.write('stop');
    if (this.current === command && !command.stopTimer) {
      command.stopTimer = setTimeout(() => {
        const error = new Error('停止引擎分析超时');
        this.rejectCurrent(error, false);
        this.failProcess(error);
      }, this.timeouts.stop);
    }
    try {
      return this.buildSearchResult(await promise, this.analysisPvList);
    } finally {
      this.analysisPromise = null;
      this.analysisPvList = [];
    }
  }

  public async quit(): Promise<void> {
    this.closing = true;
    this.ready = false;
    this.rejectCurrent(new Error('引擎已关闭'), false);
    const proc = this.process;
    if (proc) {
      try {
        await this.write('quit');
      } catch {
        // 进程可能已退出。
      }
    }
    this.disposeProcess();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
