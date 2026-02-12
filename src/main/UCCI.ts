import { ChildProcessWithoutNullStreams, spawn } from 'child_process';

import { Info as NewInfo, InfoAndMove as NewInfoAndMove, OnInfoCallback } from './engine-types';

const INFO = 'info';
const NO_BEST_MOVE = 'nobestmove';
const BEST_MOVE = 'bestmove';
const UCCI = 'ucci';
const UCI = 'uci';
const IS_READY = 'isready';
const GO = 'go';
const STOP = 'stop';
const RESTART_COMMAND = 'restart-ucci';
const QUIT = 'quit';

/**
 * info 行解析纯函数.
 * 使用关键字驱动的线性扫描, 支持所有 UCI/UCCI info 字段.
 *
 * @param line 原始 info 行 (含 'info' 前缀)
 * @returns 解析后的 Info 对象, 无法解析则返回 null
 */
export function parseInfoLine(line: string): NewInfo | null {
  if (!line || !line.trimStart().startsWith('info')) {
    return null;
  }

  const tokens = line.trim().split(/\s+/);
  // Skip the 'info' token
  let i = tokens.indexOf('info');
  if (i === -1) return null;
  i++;

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
    const token = tokens[i];

    switch (token) {
      case 'depth':
        depth = parseInt(tokens[++i], 10);
        break;
      case 'seldepth':
        seldepth = parseInt(tokens[++i], 10);
        break;
      case 'score': {
        const next = tokens[i + 1];
        if (next === 'cp') {
          scoreType = 'cp';
          i++;
          score = parseInt(tokens[++i], 10);
        } else if (next === 'mate') {
          scoreType = 'mate';
          i++;
          score = parseInt(tokens[++i], 10);
        } else {
          // UCCI style: score is directly a centipawn value
          scoreType = 'cp';
          score = parseInt(tokens[++i], 10);
        }
        break;
      }
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
        // All remaining tokens are moves
        pv = tokens.slice(i + 1);
        i = tokens.length; // Exit loop
        break;
      default:
        // Unknown token (e.g., 'string', 'currmove', etc.), skip
        break;
    }
    i++;
  }

  // Must have at least depth to be a valid info line
  if (depth === undefined) {
    return null;
  }

  const result: NewInfo = {
    depth,
    score: score ?? 0,
    scoreType,
    pv: pv ?? [],
  };

  if (seldepth !== undefined) result.seldepth = seldepth;
  if (nodes !== undefined) result.nodes = nodes;
  if (nps !== undefined) result.nps = nps;
  if (time !== undefined) result.time = time;
  if (multipv !== undefined) result.multipv = multipv;

  return result;
}

export type UCCICallback = (err: Error, data: string) => void;
const DEFAULT_HASH_SIZE = 128;
const DEFAULT_THREAD_COUNT = 4;

export interface QueryMoveOption {
  difficulty: number | null;
  maxTime: number;
}
/**
 * https://www.xqbase.com/protocol/cchess_ucci.htm
 */
export class ChessEngine {
  private callback: UCCICallback;
  private resultBuffer = '';
  public name: string;
  private IN_GO_WAITING = false;
  private release = true;
  private type: 'ucci' | 'uci' = UCCI;
  private minDiff = 1;
  private maxDiff = 5;
  private thread = DEFAULT_THREAD_COUNT;
  private hashSize = DEFAULT_HASH_SIZE;
  private engineDisplayName = '';
  private hasTreadOption = false;
  private hasHashSizeOption = false;

  private posProc: ChildProcessWithoutNullStreams;
  private UCCI_ENGINE_LOCATION: string;
  constructor(
    UCCI_ENGINE_LOCATION: string,
    name: string,
    type: 'ucci' | 'uci' = UCCI,
    thread: number = DEFAULT_THREAD_COUNT,
    hashSize: number = DEFAULT_HASH_SIZE,
    minDiff = 1,
    maxDiff = 3
  ) {
    this.UCCI_ENGINE_LOCATION = UCCI_ENGINE_LOCATION;
    this.name = name;
    this.type = type;
    this.init();
    this.maxDiff = maxDiff;
    this.minDiff = minDiff;
    this.thread = thread;
    this.hashSize = hashSize;
  }
  getQueyForTime(time: number) {
    if (this.type === UCCI) {
      return `go ponder time ${time} movestogo 1 opptime ${time} oppmovestogo 1`;
    } else {
      return `go movetime ${time}`;
    }
  }

  public async initEngine(): Promise<string> {
    console.log('init engine ', this.name);
    this.resultBuffer = '';
    const engineInfo = await this.sendAsync(this.type.toLocaleLowerCase());
    const lines = engineInfo.split('\n');
    lines.forEach((l) => {
      if (this.type === UCCI) {
        if (l.indexOf('id') !== -1) {
          const block = l.split(' ');
          if (block[1] === 'name') {
            this.engineDisplayName = block.slice(2).join(' ');
          }
        } else if (l.indexOf('option') !== -1) {
          if (l.indexOf('threads') !== -1) {
            this.hasTreadOption = true;
          } else if (l.indexOf('hashsize') !== -1) {
            this.hasHashSizeOption = true;
          }
        }
      } else {
        if (l.indexOf('id') !== -1) {
          const block = l.split(' ');
          if (block[1] === 'name') {
            this.engineDisplayName = block.slice(2).join(' ');
          }
        } else if (l.indexOf('option') !== -1) {
          if (l.indexOf('Threads') !== -1) {
            this.hasTreadOption = true;
          } else if (l.indexOf('Hash') !== -1) {
            this.hasHashSizeOption = true;
          }
        }
      }
    });
    if (this.hasTreadOption) {
      let command = `setoption name Threads value ${this.thread}`;
      if (this.type === UCCI) {
        command = `setoption threads ${this.thread}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await this.sendAsync(command);
    }
    if (this.hasHashSizeOption) {
      let command = `setoption name Hash value ${this.hashSize}`;
      if (this.type === UCCI) {
        command = `setoption hashsize ${this.hashSize}`;
      }
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      await this.sendAsync(command);
    }
    await this.sendAsync('isready');
    return engineInfo;
  }
  private connect(delayed: boolean) {
    if (!delayed && !this.release) {
      // console.log("Waiting for 3 seconds ...");
      setTimeout(this.connect, 1000, true);
    }
    //   posProc.stdin.setEncoding = "utf-8";
    this.release = false;
    // console.log("UCCI Engine started.");
  }
  private init() {
    // console.log("In init ...", this.UCCI_ENGINE_LOCATION);
    this.posProc = spawn(this.UCCI_ENGINE_LOCATION, []);

    // this.posProc.stdout.once("data", (data: any) => {
    //   const textChunk = data.toString("utf8");
    //   // console.log("data once received from engine: ", textChunk);
    // });

    this.posProc.on('exit', (_code) => {
      // console.log("Closed with code: ", code);
      // console.log("Restarting");
      if (!this.release) {
        this.init(); // Restart ...
        this.callback(null, 'Restarted ...');
      }
    });

    this.posProc.stdout.on('data', (data: any) => {
      const textChunk = data.toString('utf8');
      this.resultBuffer += textChunk;
      // console.log("Buffered message received: ", this.resultBuffer, textChunk);
      // 普通返回，不知道有多少行，收到即返回；很可能丢东西，即返回长短不确定。
      // 但不影响总的功能，因为不需要程序处理
      // INFO 的返回，需要一直等待bestmove...

      // 如果不是整行，则收满整行；否则，是个状态机

      const lastChar = textChunk.substring(textChunk.length - 1);

      if (lastChar !== '\n') {
        // need buffer this
        return; // 不callback，继续接
      }

      switch (true) {
        // 如果含nobestmove，则为结束
        case this.resultBuffer.indexOf(NO_BEST_MOVE) !== -1:
          console.log('receive nobestmove stop');
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ''; // 清空缓存
          break;

        // 如果含bestmove，则为结束
        case this.resultBuffer.indexOf(BEST_MOVE) !== -1:
          console.log('receive bestmove stop');
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          console.log('[out:bestmove]:', this.resultBuffer);
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ''; // 清空缓存
          break;

        // 如果含ucciok||uciok，则为结束
        case this.resultBuffer.indexOf('ucciok') !== -1 ||
          (this.resultBuffer.indexOf('uciok') !== -1 &&
            this.resultBuffer.indexOf('option') !== -1 &&
            this.resultBuffer.lastIndexOf('uciok') > this.resultBuffer.lastIndexOf('option')):
          console.log('receive ok stop');
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          console.log('[out:ok]:', this.resultBuffer);
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ''; // 清空缓存
          break;
        // 如果含bye，则为结束
        case this.resultBuffer.indexOf('bye') !== -1:
          console.log('receive bye stop');
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ''; // 清空缓存
          break;

        // 如果含INFO，则将信息buffer后继续，不callback，继续接
        case this.resultBuffer.indexOf(INFO) !== -1:
          this.resultBuffer += textChunk;
          break;

        default:
          if (!this.IN_GO_WAITING) {
            // 又没有bestmove,又没有info，则是其它指令，直接返回吧。
            if (this.callback) {
              // When first startup, if there is console response,
              // then callback is null. Might cause error.
              this.callback(null, textChunk);
            }
          } else {
            // 还是INFO的等待返回中，必须继续等
            this.resultBuffer += textChunk;
          }
          break;
      }
    });
    this.connect(false);
  }

  public send(command: string, callbackFun: (err: Error, data: string) => void) {
    this.resultBuffer = '';
    console.log('send command:', command);
    if (command === RESTART_COMMAND) {
      this.IN_GO_WAITING = false;
      callbackFun(null, 'Server might be restared.');
      return;
    }
    this.callback = callbackFun;
    this.posProc.stdin.write(command + '\n');
    // console.log('callback is: ', callback)

    switch (true) {
      case command.indexOf(UCCI) !== -1 ||
        (command.indexOf(UCI) !== -1 && command.indexOf(`ucinewgame`) === -1):
        this.IN_GO_WAITING = true;
        break;
      case command.indexOf(IS_READY) !== -1:
        break;
      case command.indexOf(GO) !== -1:
        this.IN_GO_WAITING = true;
        break;
      case command.indexOf(QUIT) !== -1 && this.type === UCCI:
        this.IN_GO_WAITING = true;
        break;
      case command.indexOf(STOP) !== -1:
        // This must have an imediate bestmove response, so do not callback now.
        // console.log("Calculation stops ....");
        this.IN_GO_WAITING = false;
        break;

      default:
        // When command with no resonpse, such as position,
        // send http response instead, to prevent forever waiting
        this.callback(null, 'There is no reponse.');
        break;
    }
  }
  public async sendAsync(command: string): Promise<string> {
    return new Promise<string>((resolve) => {
      this.send(command, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          console.warn('error');
          resolve('');
        }
      });
    });
  }
  public async infoAndMove(
    fen: string,
    { difficulty, maxTime }: QueryMoveOption,
    onInfo?: OnInfoCallback
  ): Promise<NewInfoAndMove | null> {
    if (this.type === UCI) {
      await this.sendAsync('ucinewgame');
    }
    let position = `position fen ${fen}`;
    if (this.type === UCI) {
      position = `fen ${fen}`;
    }
    await this.sendAsync(position);
    let time = maxTime;
    if (difficulty) {
      let dif = difficulty;
      if (difficulty > this.maxDiff) dif = this.maxDiff;
      if (difficulty < this.minDiff) dif = this.minDiff;
      time = dif * 1500;
    }

    const go = this.getQueyForTime(time);
    setTimeout(() => {
      this.posProc.stdin.write('stop' + '\n');
    }, maxTime);
    const lines = await this.sendAsync(go);

    const result: NewInfoAndMove = {
      pvList: [],
      bestmove: '',
    };
    console.log('lines:\n', lines);
    lines.split('\n').forEach((l) => {
      const trimmed = l.trim();
      if (trimmed.startsWith('info')) {
        const parsed = parseInfoLine(trimmed);
        if (parsed) {
          result.pvList.push(parsed);
          if (onInfo) {
            onInfo(parsed);
          }
        }
      } else if (trimmed.startsWith('bestmove')) {
        const tokens = trimmed.split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === 'bestmove' && i + 1 < tokens.length) {
            result.bestmove = tokens[i + 1].trim();
          } else if (tokens[i] === 'ponder' && i + 1 < tokens.length) {
            result.ponder = tokens[i + 1].trim();
          }
        }
      }
    });

    // Fill summary fields from last info line
    if (result.pvList.length > 0) {
      const lastInfo = result.pvList[result.pvList.length - 1];
      result.nodes = lastInfo.nodes;
      result.nps = lastInfo.nps;
      result.time = lastInfo.time;
    }

    return result;
  }

  public async quit() {
    if (!this.release) {
      this.release = true;
      await this.sendAsync('quit');
      if (!this.posProc.killed) {
        const forcekill = this.posProc.kill();
        console.warn('force kill ', forcekill);
      }
      this.posProc.unref();
    }
  }

  // ========================================================================
  // 分析模式 (T029)
  // ========================================================================

  private analysisOnInfo: OnInfoCallback | null = null;
  private analysisPvList: NewInfo[] = [];
  private analysisStdoutHandler: ((data: Buffer) => void) | null = null;

  /**
   * 启动无限分析模式.
   * 发送 position + go infinite, 通过 onInfo 回调实时推送分析数据.
   */
  public async analyzePosition(fen: string, onInfo: OnInfoCallback): Promise<void> {
    this.analysisOnInfo = onInfo;
    this.analysisPvList = [];

    let position = `position fen ${fen}`;
    if (this.type === UCI) {
      position = `fen ${fen}`;
    }
    await this.sendAsync(position);

    // Register a temporary stdout handler for analysis
    this.analysisStdoutHandler = (data: Buffer) => {
      const text = data.toString('utf8');
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('info')) {
          const parsed = parseInfoLine(trimmed);
          if (parsed && this.analysisOnInfo) {
            this.analysisPvList.push(parsed);
            this.analysisOnInfo(parsed);
          }
        }
      }
    };
    this.posProc.stdout.on('data', this.analysisStdoutHandler);

    // Send go infinite (don't wait for bestmove)
    this.posProc.stdin.write('go infinite\n');
  }

  /**
   * 停止当前分析, 发送 stop 命令.
   * 引擎会返回最终的 bestmove.
   */
  public async stopAnalysis(): Promise<NewInfoAndMove> {
    // Remove analysis handler
    if (this.analysisStdoutHandler) {
      this.posProc.stdout.removeListener('data', this.analysisStdoutHandler);
      this.analysisStdoutHandler = null;
    }
    this.analysisOnInfo = null;

    const response = await this.sendAsync('stop');
    const result: NewInfoAndMove = {
      pvList: this.analysisPvList,
      bestmove: '',
    };

    // Parse bestmove from response
    const lines = response.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('bestmove')) {
        const tokens = trimmed.split(/\s+/);
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i] === 'bestmove' && i + 1 < tokens.length) {
            result.bestmove = tokens[i + 1].trim();
          } else if (tokens[i] === 'ponder' && i + 1 < tokens.length) {
            result.ponder = tokens[i + 1].trim();
          }
        }
      }
    }

    // Fill summary from last info
    if (result.pvList.length > 0) {
      const lastInfo = result.pvList[result.pvList.length - 1];
      result.nodes = lastInfo.nodes;
      result.nps = lastInfo.nps;
      result.time = lastInfo.time;
    }

    this.analysisPvList = [];
    return result;
  }
}
