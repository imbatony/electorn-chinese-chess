import { BoardStatus } from "../common/IPCInfos";
import { DEFAULT_ENGINE_KEY } from "../common/constants";
import { BrowserWindow } from "electron";
import { GetUCCIEngine, ChessEngine } from "./UCCI";
import os from "os";
const engines: Map<string, ChessEngine> = new Map<string, ChessEngine>();

async function getEngineByKey(
  key: string = DEFAULT_ENGINE_KEY
): Promise<ChessEngine> {
  let engine = engines.get(key);
  if (!engine) {
    engine = GetUCCIEngine(key);
    await engine.initEngine();
    engines.set(key, engine);
  }
  return engine;
}

interface FeiJiang {
  mainWin: BrowserWindow | null;
  bgm: boolean;
  boardStaus: BoardStatus | null;
  engines: Map<string, ChessEngine>;
  getEngineByKey: (key: string) => Promise<ChessEngine>;
  getEngineByTurnAsync: (turn: boolean) => Promise<ChessEngine>;
  clearEngine: () => Promise<void[]>;
  redSide: string;
  blackSide: string;
  engineThreadCount: number;
  maxtime: number;
}
const FeiJiangInstance: FeiJiang = {
  mainWin: null,
  bgm: true,
  boardStaus: null,
  engines: engines,
  maxtime: 3000,
  engineThreadCount: 0,
  getEngineByKey: getEngineByKey,
  getEngineByTurnAsync: (turn: boolean): Promise<ChessEngine> => {
    return getEngineByKey(DEFAULT_ENGINE_KEY);
  },
  clearEngine: () => {
    return Promise.all(
      Array.from(engines.values()).map((e) => {
        return e.quit();
      })
    );
  },
  redSide: "human",
  blackSide: "human",
};
FeiJiangInstance.getEngineByTurnAsync = (
  turn: boolean
): Promise<ChessEngine> => {
  let engineKey = FeiJiangInstance.redSide;
  if (!turn) {
    engineKey = FeiJiangInstance.blackSide;
  }
  return getEngineByKey(engineKey);
};
FeiJiangInstance.engineThreadCount = os.cpus().length;
export default FeiJiangInstance;
