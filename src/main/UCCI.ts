import { spawn, ChildProcessWithoutNullStreams } from "child_process";

const INFO = "info";
const NO_BEST_MOVE = "nobestmove";
const BEST_MOVE = "bestmove";
const POSITION = "position";
export const UCCI = "ucci";
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
  pvList: Array<Info>;
  time: number;
  bestmove: string;
  ponder: string;
}
/**
 * https://www.xqbase.com/protocol/cchess_ucci.htm
 */
export class UCCIEngine {
  private callback: UCCICallback;
  private resultBuffer = "";
  private IN_GO_WAITING = false;
  private release = true;
  private posProc: ChildProcessWithoutNullStreams;
  private UCCI_ENGINE_LOCATION: string;
  constructor(UCCI_ENGINE_LOCATION: string) {
    this.UCCI_ENGINE_LOCATION = UCCI_ENGINE_LOCATION;
    this.init();
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

    this.posProc.on("exit", (code) => {
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
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
          break;

        // 如果含bestmove，则为结束
        case this.resultBuffer.indexOf(BEST_MOVE) !== -1:
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
          break;

        // 如果含INFO，则将信息buffer后继续，不callback，继续接
        case this.resultBuffer.indexOf(INFO) !== -1:
          this.resultBuffer += textChunk;
          break;

        // 如果含ucciok，则为结束
        case this.resultBuffer.indexOf("ucciok") !== -1:
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
          break;
        // 如果含bye，则为结束
        case this.resultBuffer.indexOf("bye") !== -1:
          this.IN_GO_WAITING = false;
          this.resultBuffer += textChunk;
          this.callback(null, this.resultBuffer);
          this.resultBuffer = ""; // 清空缓存
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
    if (command === RESTART_COMMAND) {
      this.IN_GO_WAITING = false;
      callbackFun(null, "Server might be restared.");
      return;
    }
    this.callback = callbackFun;
    this.posProc.stdin.write(command + "\n");
    // console.log('callback is: ', callback)

    switch (true) {
      case command.indexOf(UCCI) !== -1:
        this.IN_GO_WAITING = false;
        break;
      case command.indexOf(IS_READY) !== -1:
        break;
      case command.indexOf(GO) !== -1:
        this.IN_GO_WAITING = true;
        break;
      case command.indexOf(QUIT) !== -1:
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
          resolve("");
        }
      });
    });
  }

  public async infoAndMove(
    fen: string,
    timeout = 5000,
  ): Promise<InfoAndMove | null> {
    return new Promise<InfoAndMove | null>((resolve) => {
      this.send(`position fen ${fen}`, (err, _) => {
        if (!err) {
          this.send(
            `go time ${timeout}`,
            (err, lines) => {
              console.log(lines);
              const infoAndMove: InfoAndMove = {
                nodes: 0,
                time: 0,
                pvList: new Array<Info>(),
                bestmove: "",
                ponder: "",
              };
              lines.split("\n").forEach((l) => {
                if (l.startsWith("info time")) {
                  const infoLine = l.split(" ");
                  infoAndMove.time = parseInt(infoLine[2]);
                  infoAndMove.nodes = parseInt(infoLine[4]);
                } else if (l.startsWith("info depth")) {
                  const infoLine = l.split(" ");
                  const depth = parseInt(infoLine[2]);
                  const score = parseInt(infoLine[4]);
                  const pv = infoLine.slice(6);
                  infoAndMove.pvList.push({ depth, score, pv });
                } else if (l.startsWith("bestmove")) {
                  const bestmove = l.split(" ");
                  infoAndMove.bestmove = bestmove[1];
                  infoAndMove.ponder = bestmove[3];
                }
              });
              resolve(infoAndMove);
            }
          );
        } else {
          resolve(null);
        }
      });
    });
  }

  public async quit() {
    if (!this.release) {
      this.release = true;
      await this.sendAsync("quit");
      if (!this.posProc.killed) {
        this.posProc.kill();
      }
    }
  }
}

import path from "path";
let engineFilePath = "";
if (process.env.NODE_ENV === "development" || !process.resourcesPath) {
  engineFilePath = path.join(
    process.cwd(),
    "/assets/engine",
    "/ElephantEye/BIN/ELEEYE.EXE"
  );
} else {
  engineFilePath = path.join(
    process.resourcesPath,
    "/engine",
    "/ElephantEye/BIN/ELEEYE.EXE"
  );
}

export const GetELEEYEEngine = () => new UCCIEngine(engineFilePath);
