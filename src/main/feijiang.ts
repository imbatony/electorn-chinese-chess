import { BrowserWindow } from 'electron';
import os from 'os';

import { BoardStatus } from '../common/IPCInfos';
import { EngineConfigService } from './EngineConfigService';
import { ChessEngine } from './UCCI';

const engines: Map<string, ChessEngine> = new Map<string, ChessEngine>();
/** 防止同一 key 的引擎被并发重复初始化 */
const pendingInits: Map<string, Promise<ChessEngine>> = new Map();

async function getEngineByKey(key: string): Promise<ChessEngine> {
  // 已初始化完成的引擎直接返回
  const existing = engines.get(key);
  if (existing) return existing;

  // 正在初始化中则等待同一个 promise
  const pending = pendingInits.get(key);
  if (pending) return pending;

  const initPromise = createEngine(key);
  pendingInits.set(key, initPromise);
  try {
    return await initPromise;
  } finally {
    pendingInits.delete(key);
  }
}

async function createEngine(key: string): Promise<ChessEngine> {
  const configService = EngineConfigService.getInstance();
  let config = configService.getEngineById(key);
  if (!config) {
    // Fallback: try default engine
    const defaultId = configService.getDefaultEngineId();
    config = configService.getEngineById(defaultId);
    if (!config) throw new Error(`Engine not found: ${key}`);
  }
  const fullPath = configService.resolveEnginePath(config);
  const engine = new ChessEngine(
    fullPath,
    config.name,
    config.protocol,
    FeiJiangInstance.engineThreadCount,
    config.hashSize,
    1, // minDiff default
    3, // maxDiff default
    config.useCliArgs ?? false
  );
  await engine.initEngine();
  engines.set(key, engine);
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
  getEngineByTurnAsync: (_turn: boolean): Promise<ChessEngine> => {
    return getEngineByKey('builtin-eleeye');
  },
  clearEngine: () => {
    return Promise.all(
      Array.from(engines.values()).map((e) => {
        return e.quit();
      })
    );
  },
  redSide: 'human',
  blackSide: 'human',
};
FeiJiangInstance.getEngineByTurnAsync = (turn: boolean): Promise<ChessEngine> => {
  let engineKey = FeiJiangInstance.redSide;
  if (!turn) {
    engineKey = FeiJiangInstance.blackSide;
  }
  return getEngineByKey(engineKey);
};
FeiJiangInstance.engineThreadCount = os.cpus().length;

export default FeiJiangInstance;
