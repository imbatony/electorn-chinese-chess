import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  ENGINE_KEY_CYCLONE,
  ENGINE_KEY_ELEEYE,
  DEFAULT_ENGINE_KEY,
  ENGINE_NAME_ELEEYE,
  ENGINE_NAME_CYCLONE,
  ENGINE_KEY_GG,
  ENGINE_NAME_GG,
  ENGINE_KEY_NAO_AO,
  ENGINE_NAME_NAO_AO,
} from "../common/constants";
import FeiJiang from "./feijiang";
const INFO = "info";
const NO_BEST_MOVE = "nobestmove";
const BEST_MOVE = "bestmove";
const POSITION = "position";
export const UCCI = "ucci";
export const UCI = "uci";
export const IS_READY = "isready";
export const GO = "go";
export const STOP = "stop";
export const RESTART_COMMAND = "restart-ucci";
export const QUIT = "quit";

export type UCCICallback = (err: Error, data: string) => void;
export interface Info {
  depth: number;
  score: number;
  pv: Array<string>;
}
export interface InfoAndMove {
  nodes: number;
  nps: number;
  pvList: Array<Info>;
  time: number;
  bestmove: string;
  ponder: string;
}
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
  private resultBuffer = "";
  public name: string;
  private IN_GO_WAITING = false;
  private release = true;
  private type: "ucci" | "uci" = UCCI;
  private minDiff = 1;
  private maxDiff = 5;
  private thread = DEFAULT_THREAD_COUNT;
  private hashSize = DEFAULT_HASH_SIZE;
  private engineDisplayName = "";
  private hasTreadOption = false;
  private hasHashSizeOption = false;

  private posProc: ChildProcessWithoutNullStreams;
  private UCCI_ENGINE_LOCATION: string;
  constructor(
    UCCI_ENGINE_LOCATION: string,
    name: string,
    type: "ucci" | "uci" = UCCI,
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
    console.log("init engine ", this.name);
    this.resultBuffer = "";
    const engineInfo = await this.sendAsync(this.type.toLocaleLowerCase());
    const lines = engineInfo.split("\n");
    lines.forEach((l) => {
      if (this.type === UCCI) {
        if (l.indexOf("id") !== -1) {
          const block = l.split(" ");
          if (block[1] === "name") {
            this.engineDisplayName = block.slice(2).join(" ");
          }
        } else if (l.indexOf("option") !== -1) {
          if (l.indexOf("threads") !== -1) {
            this.hasTreadOption = true;
          } else if (l.indexOf("hashsize") !== -1) {
            this.hasHashSizeOption = true;
          }
        }
      } else {
        if (l.indexOf("id") !== -1) {
          const block = l.split(" ");
          if (block[1] === "name") {
            this.engineDisplayName = block.slice(2).join(" ");
          }
        } else if (l.indexOf("option") !== -1) {
          if (l.indexOf("Threads") !== -1) {
            this.hasTreadOption = true;
          } else if (l.indexOf("Hash") !== -1) {
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
    await this.sendAsync("isready");
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

    this.posProc.on("exit", (_code) => {
      // console.log("Closed with code: ", code);
      // console.log("Restarting");
      if (!this.release) {
        this.init(); // Restart ...
        this.callback(null, "Restarted ...");
      }
    });

    this.posProc.stdout.on("data", (data: any) => {
      const textChunk = data.toString("utf8");
      this.resultBuffer += textChunk;
      // console.log("Buffered message received: ", this.resultBuffer, textChunk);
      // 普通返回，不知道有多少行，收到即返回；很可能丢东西，即返回长短不确定。
      // 但不影响总的功能，因为不需要程序处理
      // INFO 的返回，需要一直等待bestmove...

      // 如果不是整行，则收满整行；否则，是个状态机

      const lastChar = textChunk.substring(textChunk.length - 1);

      if (lastChar !== "\n") {
        // need buffer this
        return; // 不callback，继续接
      }

      switch (true) {
        // 如果含nobestmove，则为结束
        case this.resultBuffer.indexOf(NO_BEST_MOVE) !== -1:
          console.log("receive nobestmove stop");
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
          break;

        // 如果含bestmove，则为结束
        case this.resultBuffer.indexOf(BEST_MOVE) !== -1:
          console.log("receive bestmove stop");
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          console.log("[out:bestmove]:", this.resultBuffer);
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
          break;

        // 如果含ucciok||uciok，则为结束
        case this.resultBuffer.indexOf("ucciok") !== -1 ||
          (this.resultBuffer.indexOf("uciok") !== -1 && this.resultBuffer.indexOf("option") !== -1  && this.resultBuffer.lastIndexOf("uciok") > this.resultBuffer.lastIndexOf("option")):
          console.log("receive ok stop");
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          console.log("[out:ok]:", this.resultBuffer);
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
          break;
        // 如果含bye，则为结束
        case this.resultBuffer.indexOf("bye") !== -1:
          console.log("receive bye stop");
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
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

  public send(
    command: string,
    callbackFun: (err: Error, data: string) => void
  ) {
    this.resultBuffer = "";
    console.log("send command:", command);
    if (command === RESTART_COMMAND) {
      this.IN_GO_WAITING = false;
      callbackFun(null, "Server might be restared.");
      return;
    }
    this.callback = callbackFun;
    this.posProc.stdin.write(command + "\n");
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
        this.callback(null, "There is no reponse.");
        break;
    }
  }
  public async sendAsync(command: string): Promise<string> {
    return new Promise<string>((resolve) => {
      this.send(command, (err, data) => {
        if (!err) {
          resolve(data);
        } else {
          console.warn("error");
          resolve("");
        }
      });
    });
  }
  public async infoAndMove(
    fen: string,
    { difficulty, maxTime }: QueryMoveOption
  ): Promise<InfoAndMove | null> {
    if (this.type === UCI) {
      await this.sendAsync("ucinewgame");
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
      this.posProc.stdin.write("stop" + "\n");
    }, maxTime);
    const lines = await this.sendAsync(go);

    const infoAndMove: InfoAndMove = {
      nodes: 0,
      time: 0,
      nps: 0,
      pvList: new Array<Info>(),
      bestmove: "",
      ponder: "",
    };
    console.log("lines:\n", lines);
    lines.split("\n").forEach((l) => {
      if (l.startsWith("info")) {
        const infos = l.substring(5).split(" ");
        const infoObj: Info = { depth: 0, score: 0, pv: [] };
        for (let i = 0; i < infos.length; i += 2) {
          if (infos[i] == "score") {
            infoObj.score = parseInt(infos[i + 1]);
          } else if (infos[i] == "depth") {
            infoObj.score = parseInt(infos[i + 1]);
          } else if (infos[i] == "nps") {
            infoObj.score = parseInt(infos[i + 1]);
          } else if (infos[i] == "pv") {
            infoObj.pv = infos.slice(i);
          }
        }
      } else if (l.startsWith("bestmove")) {
        console.log("bestmove line:", l);
        const infos = l.split(" ");
        for (let i = 0; i < infos.length; i += 2) {
          if (infos[i] == "bestmove") {
            infoAndMove.bestmove = infos[i + 1].trim();
            console.log("set best move:", infoAndMove.bestmove);
          } else if (infos[i] == "ponder") {
            infoAndMove.ponder = infos[i + 1].trim();
          }
        }
      }
    });
    return infoAndMove;
  }

  public async quit() {
    if (!this.release) {
      this.release = true;
      await this.sendAsync("quit");
      if (!this.posProc.killed) {
        const forcekill = this.posProc.kill();
        console.warn("force kill ",forcekill);
      }
      this.posProc.unref();
    }
  }
}

import path from "path";
import FeiJiangInstance from "./feijiang";
let basePath = process.resourcesPath;

if (process.env.NODE_ENV === "development" || !process.resourcesPath) {
  basePath = path.join(process.cwd(), "assets");
}
const ELEEYEFilePath = path.join(basePath, "engine/ElephantEye/BIN/ELEEYE.EXE");
const cycloneFilePath = path.join(basePath, "engine/cyclone/cyclone.exe");
const ggFilePath = path.join(basePath, "engine/gg20180531/NewGG.exe");
const naoaoFilePath = path.join(basePath, "engine/sachess1.6/sachess_x86.exe");

export const GetUCCIEngine = (key = DEFAULT_ENGINE_KEY): ChessEngine => {
  if (key === ENGINE_KEY_ELEEYE) {
    return new ChessEngine(
      ELEEYEFilePath,
      ENGINE_NAME_ELEEYE,
      UCCI,
      FeiJiangInstance.engineThreadCount
    );
  } else if (key === ENGINE_KEY_CYCLONE) {
    return new ChessEngine(
      cycloneFilePath,
      ENGINE_NAME_CYCLONE,
      UCCI,
      FeiJiangInstance.engineThreadCount
    );
  } else if (key === ENGINE_KEY_GG) {
    return new ChessEngine(
      ggFilePath,
      ENGINE_NAME_GG,
      UCI,
      FeiJiangInstance.engineThreadCount
    );
  } else if (key === ENGINE_KEY_NAO_AO) {
    return new ChessEngine(
      naoaoFilePath,
      ENGINE_NAME_NAO_AO,
      UCI,
      FeiJiangInstance.engineThreadCount
    );
  } else {
    return new ChessEngine(ELEEYEFilePath, ENGINE_NAME_ELEEYE);
  }
};
interface EngineKeyName {
  key: string;
  name: string;
}
export const GetAllEngineKeyNames = (): EngineKeyName[] => {
  return [
    { key: ENGINE_KEY_ELEEYE, name: ENGINE_NAME_ELEEYE },
    { key: ENGINE_KEY_CYCLONE, name: ENGINE_NAME_CYCLONE },
    { key: ENGINE_KEY_GG, name: ENGINE_NAME_GG },
    { key: ENGINE_KEY_NAO_AO, name: ENGINE_NAME_NAO_AO },
  ];
};
