import fs from 'fs';
import path from 'path';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';

// Mock electron app before importing the service
const mockGetPath = jest.fn().mockReturnValue('/mock/userData');
jest.mock('electron', () => ({
  app: {
    getPath: mockGetPath,
  },
}));

// Mock fs module
jest.mock('fs');
jest.mock('child_process');

const mockedFs = jest.mocked(fs);
const mockedSpawn = jest.mocked(spawn);

// Import after mocks
import { EngineConfigService } from '../src/main/EngineConfigService';
import { EngineConfigFile } from '../src/main/engine-types';

// Helper: create a valid default config
function createDefaultConfig(): EngineConfigFile {
  return {
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
}

describe('EngineConfigService', () => {
  let service: EngineConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton for each test
    EngineConfigService['instance'] = undefined as any;
    service = EngineConfigService.getInstance();
  });

  describe('getInstance()', () => {
    it('should return the same instance', () => {
      const a = EngineConfigService.getInstance();
      const b = EngineConfigService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('init()', () => {
    it('should generate default config when engines.json does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      service.init();

      // Should write default config
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
      const writtenPath = mockedFs.writeFileSync.mock.calls[0][0];
      const writtenData = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string);
      expect(writtenPath).toContain('engines.json');
      expect(writtenData.version).toBe('1.0');
      expect(writtenData.engines).toHaveLength(3);
      expect(writtenData.defaultEngineId).toBe('builtin-eleeye');

      // Verify builtin engines
      const ids = writtenData.engines.map((e: any) => e.id);
      expect(ids).toContain('builtin-eleeye');
      expect(ids).toContain('builtin-gg');
      expect(ids).toContain('builtin-sachess');
    });

    it('should load existing valid config', () => {
      const existingConfig = createDefaultConfig();
      existingConfig.engines.push({
        id: 'custom-12345',
        name: 'Pikafish',
        path: 'C:\\engines\\pikafish.exe',
        protocol: 'uci',
        builtin: false,
      });

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existingConfig));

      service.init();

      expect(service.getAllEngines()).toHaveLength(4);
      expect(service.getEngineById('custom-12345')?.name).toBe('Pikafish');
    });

    it('should backup and regenerate when config is corrupted', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{ corrupt json !!!');
      mockedFs.copyFileSync.mockReturnValue(undefined);
      mockedFs.writeFileSync.mockReturnValue(undefined);

      service.init();

      // Should backup corrupted file
      expect(mockedFs.copyFileSync).toHaveBeenCalledTimes(1);
      const backupPath = mockedFs.copyFileSync.mock.calls[0][1] as string;
      expect(backupPath).toContain('.bak');

      // Should write fresh default config
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
      expect(service.getAllEngines()).toHaveLength(3);
    });
  });

  describe('getAllEngines()', () => {
    it('should return a copy of the engines array', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();

      const engines1 = service.getAllEngines();
      const engines2 = service.getAllEngines();
      expect(engines1).toEqual(engines2);
      expect(engines1).not.toBe(engines2); // Different array reference
    });
  });

  describe('getEngineById()', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();
    });

    it('should return engine when id exists', () => {
      const engine = service.getEngineById('builtin-eleeye');
      expect(engine).toBeDefined();
      expect(engine!.name).toBe('象眼');
    });

    it('should return undefined when id does not exist', () => {
      const engine = service.getEngineById('nonexistent');
      expect(engine).toBeUndefined();
    });
  });

  describe('getDefaultEngineId()', () => {
    it('should return the default engine id', () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();

      expect(service.getDefaultEngineId()).toBe('builtin-eleeye');
    });
  });

  describe('resolveEnginePath()', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();
    });

    it('should join basePath for builtin engines', () => {
      const engine = service.getEngineById('builtin-eleeye')!;
      const resolved = service.resolveEnginePath(engine);
      // Should contain the relative path from config
      expect(resolved).toContain('engine');
      expect(resolved).toContain('ELEEYE.EXE');
    });

    it('should return absolute path for custom engines', () => {
      const customEngine = {
        id: 'custom-123',
        name: 'Test',
        path: 'C:\\engines\\test.exe',
        protocol: 'uci' as const,
        builtin: false,
      };
      const resolved = service.resolveEnginePath(customEngine);
      expect(resolved).toBe('C:\\engines\\test.exe');
    });
  });

  describe('isEngineAvailable()', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();
    });

    it('should return true for builtin engines', () => {
      const engine = service.getEngineById('builtin-eleeye')!;
      expect(service.isEngineAvailable(engine)).toBe(true);
    });

    it('should check fs.existsSync for custom engines', () => {
      const customEngine = {
        id: 'custom-123',
        name: 'Test',
        path: 'C:\\engines\\test.exe',
        protocol: 'uci' as const,
        builtin: false,
      };

      // Reset mock after init calls
      mockedFs.existsSync.mockReset();
      mockedFs.existsSync.mockReturnValue(true);
      expect(service.isEngineAvailable(customEngine)).toBe(true);

      mockedFs.existsSync.mockReturnValue(false);
      expect(service.isEngineAvailable(customEngine)).toBe(false);
    });
  });

  describe('addCustomEngine()', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();
      mockedFs.writeFileSync.mockClear();
    });

    it('should add a custom engine and save', () => {
      const result = service.addCustomEngine('C:\\engines\\pikafish.exe', {
        success: true,
        protocol: 'uci',
        name: 'Pikafish',
      });

      expect(result.id).toMatch(/^custom-\d+$/);
      expect(result.name).toBe('Pikafish');
      expect(result.path).toBe('C:\\engines\\pikafish.exe');
      expect(result.protocol).toBe('uci');
      expect(result.builtin).toBe(false);
      expect(service.getAllEngines()).toHaveLength(4);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should throw when path already exists', () => {
      service.addCustomEngine('C:\\engines\\pikafish.exe', {
        success: true,
        protocol: 'uci',
        name: 'Pikafish',
      });

      expect(() => {
        service.addCustomEngine('C:\\engines\\pikafish.exe', {
          success: true,
          protocol: 'uci',
          name: 'Pikafish 2',
        });
      }).toThrow();
    });
  });

  describe('removeCustomEngine()', () => {
    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();

      // Add a custom engine first
      service.addCustomEngine('C:\\engines\\pikafish.exe', {
        success: true,
        protocol: 'uci',
        name: 'Pikafish',
      });
      mockedFs.writeFileSync.mockClear();
    });

    it('should remove a custom engine and save', () => {
      const engines = service.getAllEngines();
      const customEngine = engines.find((e) => !e.builtin)!;

      const result = service.removeCustomEngine(customEngine.id);
      expect(result).toBe(true);
      expect(service.getAllEngines()).toHaveLength(3);
      expect(mockedFs.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('should return false for builtin engine', () => {
      const result = service.removeCustomEngine('builtin-eleeye');
      expect(result).toBe(false);
      expect(service.getAllEngines()).toHaveLength(4);
    });

    it('should return false for nonexistent engine', () => {
      const result = service.removeCustomEngine('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('probeEngine()', () => {
    function createMockProcess() {
      const proc = new EventEmitter() as EventEmitter & {
        stdin: { write: jest.Mock };
        stdout: EventEmitter;
        killed: boolean;
        kill: jest.Mock;
      };
      proc.stdin = { write: jest.fn() };
      proc.stdout = new EventEmitter();
      proc.killed = false;
      proc.kill = jest.fn(() => { proc.killed = true; });
      return proc;
    }

    beforeEach(() => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.writeFileSync.mockReturnValue(undefined);
      service.init();
    });

    it('should detect UCI engine', async () => {
      const mockProc = createMockProcess();
      mockedSpawn.mockReturnValue(mockProc as any);

      const promise = service.probeEngine('C:\\engines\\pikafish.exe');

      // Simulate UCI response
      setTimeout(() => {
        mockProc.stdout.emit('data', Buffer.from('id name Pikafish 2024\nuciok\n'));
      }, 50);

      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.protocol).toBe('uci');
      expect(result.name).toBe('Pikafish 2024');
    });

    it('should detect UCCI engine after UCI timeout', async () => {
      jest.useFakeTimers();
      const mockProc = createMockProcess();
      mockedSpawn.mockReturnValue(mockProc as any);

      const promise = service.probeEngine('C:\\engines\\eleeye.exe');

      // Advance past UCI timeout (3s)
      jest.advanceTimersByTime(3100);

      // Simulate UCCI response
      mockProc.stdout.emit('data', Buffer.from('id name ElephantEye\nucciok\n'));

      jest.useRealTimers();
      const result = await promise;
      expect(result.success).toBe(true);
      expect(result.protocol).toBe('ucci');
      expect(result.name).toBe('ElephantEye');
    }, 10000);

    it('should fail when spawn throws', async () => {
      mockedSpawn.mockImplementation(() => { throw new Error('ENOENT'); });

      const result = await service.probeEngine('C:\\nonexistent.exe');
      expect(result.success).toBe(false);
      expect(result.protocol).toBeNull();
      expect(result.error).toContain('无法启动引擎');
    });
  });
});
