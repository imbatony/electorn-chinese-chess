/**
 * GameRecordService - 棋谱文件 I/O 服务
 *
 * 运行在 Electron 主进程中，处理所有文件读写操作
 */

import { app, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

import {
  GameRecord,
  parseGameRecord,
  stringifyGameRecord,
  validateGameRecord,
  ValidationResult,
} from '../common/GameRecord';
import { SaveResponse, LoadResponse, ExportResponse } from '../common/IPCInfos';

// ============================================================================
// Constants
// ============================================================================

/** 最大文件大小 (10 MB) */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** 保存目录名 */
const SAVE_DIR = 'save';

/** 自动保存目录名 */
const AUTOSAVE_DIR = 'autosave';

/** 自动保存文件名 */
const AUTOSAVE_FILENAME = 'autosave.json';

// ============================================================================
// GameRecordService
// ============================================================================

export class GameRecordService {
  private static instance: GameRecordService;
  
  private userDataPath: string;
  private savePath: string;
  private autoSavePath: string;
  private autoSaveFilePath: string;

  private constructor() {
    this.userDataPath = app.getPath('userData');
    this.savePath = path.join(this.userDataPath, SAVE_DIR);
    this.autoSavePath = path.join(this.userDataPath, AUTOSAVE_DIR);
    this.autoSaveFilePath = path.join(this.autoSavePath, AUTOSAVE_FILENAME);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): GameRecordService {
    if (!GameRecordService.instance) {
      GameRecordService.instance = new GameRecordService();
    }
    return GameRecordService.instance;
  }

  /**
   * 初始化目录结构
   * 在应用启动时调用
   */
  public initDirectories(): void {
    // 创建 save 目录
    if (!fs.existsSync(this.savePath)) {
      fs.mkdirSync(this.savePath, { recursive: true });
      console.log('[GameRecordService] Created save directory:', this.savePath);
    }

    // 创建 autosave 目录
    if (!fs.existsSync(this.autoSavePath)) {
      fs.mkdirSync(this.autoSavePath, { recursive: true });
      console.log('[GameRecordService] Created autosave directory:', this.autoSavePath);
    }
  }

  /**
   * 获取默认保存路径
   */
  public getDefaultSavePath(): string {
    return this.savePath;
  }

  // ============================================================================
  // 保存操作
  // ============================================================================

  /**
   * 保存棋谱到文件
   * @param record 棋谱记录
   * @param parentWindow 父窗口 (用于对话框)
   * @returns 保存结果
   */
  public async save(record: GameRecord, parentWindow?: BrowserWindow): Promise<SaveResponse> {
    try {
      // 生成默认文件名
      const defaultFilename = this.generateFilename(record);
      
      // 显示保存对话框
      const result = await dialog.showSaveDialog(parentWindow ?? BrowserWindow.getFocusedWindow()!, {
        defaultPath: path.join(this.savePath, defaultFilename),
        filters: [
          { name: '棋谱文件', extensions: ['json'] },
        ],
        title: '保存棋谱',
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: '用户取消保存' };
      }

      // 写入文件 (带重试逻辑)
      const content = stringifyGameRecord(record);
      return await this.writeFileWithRetry(result.filePath, content, parentWindow);
    } catch (e) {
      const error = `保存失败: ${(e as Error).message}`;
      console.error('[GameRecordService]', error);
      return { success: false, error };
    }
  }

  /**
   * 生成默认文件名
   */
  private generateFilename(record: GameRecord): string {
    const date = new Date(record.metadata.date);
    const dateStr = date.toISOString().slice(0, 10); // YYYY-MM-DD
    const timeStr = date.toTimeString().slice(0, 5).replace(':', ''); // HHmm
    return `game_${dateStr}_${timeStr}.json`;
  }

  /**
   * 写入文件，支持重试（用于处理文件被占用的情况）
   */
  private async writeFileWithRetry(
    filePath: string,
    content: string,
    parentWindow?: BrowserWindow,
    maxRetries: number = 3
  ): Promise<SaveResponse> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('[GameRecordService] Saved game record to:', filePath);
        return { success: true, filePath };
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        
        // 检查是否是文件被占用的错误
        if ((err.code === 'EBUSY' || err.code === 'EACCES') && attempt < maxRetries) {
          console.warn(`[GameRecordService] File busy, attempt ${attempt}/${maxRetries}`);
          
          // 询问用户是否重试
          const result = await dialog.showMessageBox(parentWindow ?? BrowserWindow.getFocusedWindow()!, {
            type: 'warning',
            buttons: ['重试', '取消'],
            defaultId: 0,
            cancelId: 1,
            title: '文件被占用',
            message: `文件 "${path.basename(filePath)}" 正被其他程序使用。请关闭该文件后重试。`,
          });
          
          if (result.response !== 0) {
            return { success: false, error: '用户取消保存' };
          }
          
          // 等待一小段时间后重试
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
        
        // 其他错误或重试次数用尽
        throw e;
      }
    }
    
    return { success: false, error: '保存失败：文件无法写入' };
  }

  // ============================================================================
  // 加载操作
  // ============================================================================

  /**
   * 从文件加载棋谱
   * @param parentWindow 父窗口 (用于对话框)
   * @returns 加载结果
   */
  public async load(parentWindow?: BrowserWindow): Promise<LoadResponse> {
    try {
      // 显示打开对话框
      const result = await dialog.showOpenDialog(parentWindow ?? BrowserWindow.getFocusedWindow()!, {
        defaultPath: this.savePath,
        filters: [
          { name: '棋谱文件', extensions: ['json'] },
          { name: 'PGN棋谱', extensions: ['pgn'] },
          { name: '所有文件', extensions: ['*'] },
        ],
        title: '加载棋谱',
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: '用户取消加载' };
      }

      const filePath = result.filePaths[0];
      return this.loadFromPath(filePath);
    } catch (e) {
      const error = `加载失败: ${(e as Error).message}`;
      console.error('[GameRecordService]', error);
      return { success: false, error };
    }
  }

  /**
   * 从指定路径加载棋谱
   * @param filePath 文件路径
   * @returns 加载结果
   */
  public loadFromPath(filePath: string): LoadResponse {
    try {
      // 检查文件是否存在
      if (!fs.existsSync(filePath)) {
        return { success: false, error: '文件不存在' };
      }

      // 检查文件大小
      const stats = fs.statSync(filePath);
      if (stats.size > MAX_FILE_SIZE) {
        return { success: false, error: `文件过大 (${Math.round(stats.size / 1024 / 1024)}MB)，最大支持 10MB` };
      }

      // 读取文件内容
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // 解析并验证
      const { record, errors } = parseGameRecord(content);
      if (!record) {
        return { success: false, error: `棋谱格式无效: ${errors.join('; ')}` };
      }

      console.log('[GameRecordService] Loaded game record from:', filePath);
      return { success: true, record };
    } catch (e) {
      const error = `加载失败: ${(e as Error).message}`;
      console.error('[GameRecordService]', error);
      return { success: false, error };
    }
  }

  /**
   * 验证棋谱记录
   * @param record 棋谱记录
   * @returns 验证结果
   */
  public validateRecord(record: unknown): ValidationResult {
    return validateGameRecord(record);
  }

  // ============================================================================
  // 自动保存
  // ============================================================================

  /**
   * 自动保存棋谱
   * @param record 棋谱记录
   */
  public autoSave(record: GameRecord): void {
    try {
      const content = stringifyGameRecord(record);
      fs.writeFileSync(this.autoSaveFilePath, content, 'utf-8');
      console.log('[GameRecordService] Auto-saved game record');
    } catch (e) {
      console.error('[GameRecordService] Auto-save failed:', (e as Error).message);
    }
  }

  /**
   * 检查是否存在自动保存文件
   * @returns 自动保存检查结果
   */
  public checkAutoSave(): { hasAutoSave: boolean; record?: GameRecord; timestamp?: string } {
    try {
      if (!fs.existsSync(this.autoSaveFilePath)) {
        return { hasAutoSave: false };
      }

      const stats = fs.statSync(this.autoSaveFilePath);
      const content = fs.readFileSync(this.autoSaveFilePath, 'utf-8');
      const { record } = parseGameRecord(content);

      if (record) {
        return {
          hasAutoSave: true,
          record,
          timestamp: stats.mtime.toISOString(),
        };
      }

      return { hasAutoSave: false };
    } catch (e) {
      console.error('[GameRecordService] Check auto-save failed:', (e as Error).message);
      return { hasAutoSave: false };
    }
  }

  /**
   * 丢弃自动保存文件
   */
  public discardAutoSave(): void {
    try {
      if (fs.existsSync(this.autoSaveFilePath)) {
        fs.unlinkSync(this.autoSaveFilePath);
        console.log('[GameRecordService] Discarded auto-save file');
      }
    } catch (e) {
      console.error('[GameRecordService] Discard auto-save failed:', (e as Error).message);
    }
  }

  // ============================================================================
  // PGN 导出
  // ============================================================================

  /**
   * 导出棋谱为 PGN 格式
   * @param record 棋谱记录
   * @param pgnContent PGN 内容字符串
   * @param parentWindow 父窗口 (用于对话框)
   * @returns 导出结果
   */
  public async export(record: GameRecord, pgnContent: string, parentWindow?: BrowserWindow): Promise<ExportResponse> {
    try {
      // 生成默认文件名
      const defaultFilename = this.generateFilename(record).replace('.json', '.pgn');
      
      // 显示保存对话框
      const result = await dialog.showSaveDialog(parentWindow ?? BrowserWindow.getFocusedWindow()!, {
        defaultPath: path.join(this.savePath, defaultFilename),
        filters: [
          { name: 'PGN 棋谱', extensions: ['pgn'] },
        ],
        title: '导出 PGN 棋谱',
      });

      if (result.canceled || !result.filePath) {
        return { success: false, error: '用户取消导出' };
      }

      // 写入文件
      fs.writeFileSync(result.filePath, pgnContent, 'utf-8');

      console.log('[GameRecordService] Exported PGN to:', result.filePath);
      return { success: true, filePath: result.filePath };
    } catch (e) {
      const error = `导出失败: ${(e as Error).message}`;
      console.error('[GameRecordService]', error);
      return { success: false, error };
    }
  }
}

// 导出单例
export const gameRecordService = GameRecordService.getInstance();
