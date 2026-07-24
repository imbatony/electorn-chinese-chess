import { GameRecord, validateGameRecord } from '../common/GameRecord';
import { AutoSaveResponse } from '../common/IPCInfos';

export interface AutoSaveWriter {
  autoSave(record: GameRecord): void;
}

export function writeAutoSave(writer: AutoSaveWriter, record: unknown): AutoSaveResponse {
  const validation = validateGameRecord(record);
  if (!validation.valid) {
    return { success: false, error: `棋谱格式无效: ${validation.errors.join('; ')}` };
  }
  try {
    writer.autoSave(record as GameRecord);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
