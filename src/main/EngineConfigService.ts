import { app } from 'electron';

import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

import { parseEngineOptionLine } from './UCCI';
import { EngineConfig, EngineConfigFile, EngineOption, EngineProbeResult } from './engine-types';

/** 默认配置: 3 个内置引擎 */
const DEFAULT_CONFIG: EngineConfigFile = {
  version: '1.0',
  defaultEngineId: 'builtin-eleeye',
  engines: [
    {
      id: 'builtin-eleeye',
      name: '象眼',
      path: 'engine/ElephantEye/BIN/ELEEYE.EXE',
      protocol: 'ucci',
      builtin: true,
    },
    {
      id: 'builtin-gg',
      name: '佳佳',
      path: 'engine/gg20180531/NewGG.exe',
      protocol: 'uci',
      builtin: true,
    },
    {
      id: 'builtin-sachess',
      name: '南奥',
      path: 'engine/sachess1.6/sachess_x86.exe',
      protocol: 'uci',
      builtin: true,
    },
  ],
};

/**
 * 引擎配置服务 (单例)
 *
 * 负责引擎配置 CRUD、协议检测、路径校验。
 * 参照 GameRecordService 模式。
 */
export class EngineConfigService {
  private static instance: EngineConfigService;
  private configPath = '';
  private basePath = '';
  private config: EngineConfigFile = { version: '1.0', engines: [], defaultEngineId: '' };

  private constructor() {
    // private constructor for singleton
  }

  /** 获取单例实例 */
  static getInstance(): EngineConfigService {
    if (!EngineConfigService.instance) {
      EngineConfigService.instance = new EngineConfigService();
    }
    return EngineConfigService.instance;
  }

  // ========================================================================
  // 生命周期
  // ========================================================================

  /**
   * 初始化服务, 加载或生成配置文件.
   * 在 app 'ready' 事件后调用, 在 createWindow() 之前.
   */
  init(): void {
    this.configPath = path.join(app.getPath('userData'), 'engines.json');

    // basePath: 生产环境使用 resourcesPath, 开发环境使用项目根目录 assets/
    if (process.env.NODE_ENV === 'development' || !process.resourcesPath) {
      this.basePath = path.join(process.cwd(), 'assets');
    } else {
      this.basePath = process.resourcesPath;
    }

    if (fs.existsSync(this.configPath)) {
      try {
        const raw = fs.readFileSync(this.configPath, 'utf-8');
        const parsed = JSON.parse(raw) as EngineConfigFile;

        // Basic validation
        if (!parsed.version || !Array.isArray(parsed.engines) || parsed.engines.length === 0) {
          throw new Error('Invalid config structure');
        }

        this.config = parsed;
        console.log(
          `[EngineConfigService] Loaded ${this.config.engines.length} engines from config`
        );
      } catch (err) {
        // Config corrupted: backup and regenerate
        console.warn('[EngineConfigService] Config corrupted, backing up and regenerating:', err);
        const backupPath = this.configPath + '.bak';
        fs.copyFileSync(this.configPath, backupPath);
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        this.save();
      }
    } else {
      // First launch: generate default config
      console.log('[EngineConfigService] No config found, generating defaults');
      this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      this.save();
    }
  }

  // ========================================================================
  // 查询
  // ========================================================================

  /** 获取所有引擎配置列表 (返回数组副本) */
  getAllEngines(): EngineConfig[] {
    return [...this.config.engines];
  }

  /** 根据 ID 获取单个引擎配置 */
  getEngineById(id: string): EngineConfig | undefined {
    return this.config.engines.find((e) => e.id === id);
  }

  /** 获取默认引擎 ID */
  getDefaultEngineId(): string {
    return this.config.defaultEngineId;
  }

  /**
   * 获取引擎的完整 EXE 路径.
   * 内置引擎: basePath + config.path
   * 自定义引擎: config.path (已是绝对路径)
   */
  resolveEnginePath(config: EngineConfig): string {
    if (config.builtin) {
      return path.join(this.basePath, config.path);
    }
    return config.path;
  }

  /** 检查引擎 EXE 文件是否存在 */
  isEngineAvailable(config: EngineConfig): boolean {
    if (config.builtin) {
      return true;
    }
    return fs.existsSync(config.path);
  }

  // ========================================================================
  // 引擎加载 (自定义引擎)
  // ========================================================================

  /**
   * 探测指定 EXE 文件的引擎协议类型.
   *
   * 探测策略:
   * 1. 启动引擎，通过 stdin 发送 'uci' 命令，等待 2 秒
   * 2. 如果收到 'uciok' → UCI 协议
   * 3. 如果超时，发送 'ucci' 命令，等待 2 秒
   * 4. 如果收到 'ucciok' → UCCI 协议
   * 5. 否则报错
   */
  async probeEngine(exePath: string): Promise<EngineProbeResult> {
    // 所有引擎都通过 stdin 探测，不使用 CLI args
    const stdinResult = await this.probeEngineStdin(exePath);
    if (stdinResult.success) {
      return stdinResult;
    }

    // 探测失败
    return {
      success: false,
      protocol: null,
      error: '协议检测失败: 引擎未响应 uci 或 ucci 命令',
    };
  }

  /**
   * 通过 stdin 探测引擎协议
   */
  private probeEngineStdin(exePath: string): Promise<EngineProbeResult> {
    return new Promise((resolve) => {
      let proc: ChildProcessWithoutNullStreams | null = null;
      let buffer = '';
      let finished = false;
      let phase: 'uci' | 'ucci' = 'uci';
      let engineName: string | undefined;
      let engineOptions: EngineOption[] = [];
      let phaseTimer: ReturnType<typeof setTimeout> | null = null;

      const cleanup = () => {
        if (phaseTimer) clearTimeout(phaseTimer);
        phaseTimer = null;
        if (!proc) return;
        proc.stdout.removeListener('data', onData);
        proc.removeListener('error', onError);
        proc.removeListener('close', onClose);
        if (!proc.killed) proc.kill();
        proc.unref();
      };

      const finish = (result: EngineProbeResult) => {
        if (finished) return;
        finished = true;
        cleanup();
        resolve(result);
      };

      const onError = (err: Error) => {
        finish({
          success: false,
          protocol: null,
          error: `引擎进程错误: ${err.message}`,
        });
      };

      const onClose = () => {
        finish({
          success: false,
          protocol: null,
          error: '引擎在协议检测完成前退出',
        });
      };

      const onData = (data: Buffer) => {
        buffer += data.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (line.startsWith('id name ')) engineName = line.slice(8).trim();
          const option = parseEngineOptionLine(line);
          if (option) engineOptions.push(option);
          if (phase === 'uci' && line === 'uciok' && engineName) {
            finish({
              success: true,
              protocol: 'uci',
              name: engineName,
              options: engineOptions,
            });
            return;
          }
          if (phase === 'ucci' && line === 'ucciok' && engineName) {
            finish({
              success: true,
              protocol: 'ucci',
              name: engineName,
              options: engineOptions,
            });
            return;
          }
        }
      };

      const write = (command: 'uci' | 'ucci') => {
        try {
          proc!.stdin.write(`${command}\n`, (error) => {
            if (error) {
              finish({
                success: false,
                protocol: null,
                error: `写入引擎失败: ${error.message}`,
              });
            }
          });
        } catch (error) {
          finish({
            success: false,
            protocol: null,
            error: `写入引擎失败: ${error instanceof Error ? error.message : String(error)}`,
          });
        }
      };

      const startTimer = () => {
        phaseTimer = setTimeout(() => {
          if (phase === 'uci') {
            phase = 'ucci';
            buffer = '';
            engineName = undefined;
            engineOptions = [];
            write('ucci');
            startTimer();
          } else {
            finish({
              success: false,
              protocol: null,
              error: 'stdin 模式超时',
            });
          }
        }, 2000);
      };

      try {
        proc = spawn(exePath, []);
      } catch (err) {
        finish({
          success: false,
          protocol: null,
          error: `无法启动引擎: ${err instanceof Error ? err.message : String(err)}`,
        });
        return;
      }

      proc.stdout.on('data', onData);
      proc.on('error', onError);
      proc.on('close', onClose);
      write('uci');
      startTimer();
    });
  }

  /**
   * 添加自定义引擎到配置.
   * @param exePath EXE 绝对路径
   * @param probeResult 探测结果
   * @returns 新创建的 EngineConfig
   * @throws 若路径已存在于配置中
   */
  addCustomEngine(exePath: string, probeResult: EngineProbeResult): EngineConfig {
    // Check path duplicate
    const existing = this.config.engines.find((e) => e.path === exePath);
    if (existing) {
      throw new Error(`引擎路径已存在: ${exePath}`);
    }

    const newConfig: EngineConfig = {
      id: `custom-${Date.now()}`,
      name: probeResult.name || path.basename(exePath, '.exe'),
      path: exePath,
      protocol: probeResult.protocol!,
      builtin: false,
    };

    this.config.engines.push(newConfig);
    this.save();

    return newConfig;
  }

  // ========================================================================
  // 引擎移除 (自定义引擎)
  // ========================================================================

  /**
   * 移除自定义引擎.
   * @param id 引擎 ID
   * @returns true=成功, false=未找到或为内置引擎
   */
  removeCustomEngine(id: string): boolean {
    const engine = this.config.engines.find((e) => e.id === id);
    if (!engine || engine.builtin) {
      return false;
    }

    this.config.engines = this.config.engines.filter((e) => e.id !== id);
    this.save();
    return true;
  }

  // ========================================================================
  // 持久化 (私有)
  // ========================================================================

  /** 将当前配置写入 engines.json */
  private save(): void {
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
  }
}
