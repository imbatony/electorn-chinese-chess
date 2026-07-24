import * as fs from 'fs';

import { GAME_RECORD_VERSION, GameRecord } from '../src/common/GameRecord';
import { GameRecordService } from '../src/main/GameRecordService';

const showSaveDialog = jest.fn();

jest.mock('electron', () => ({
  app: { getPath: jest.fn().mockReturnValue('C:\\mock\\userData') },
  BrowserWindow: { getFocusedWindow: jest.fn() },
  dialog: {
    showSaveDialog: (...args: unknown[]) => showSaveDialog(...args),
    showOpenDialog: jest.fn(),
    showMessageBox: jest.fn(),
  },
}));
jest.mock('fs');

const mockedFs = jest.mocked(fs);

function createRecord(): GameRecord {
  return {
    version: GAME_RECORD_VERSION,
    metadata: {
      date: '2026-07-24T12:43:16.177Z',
      redPlayer: { type: 'human', name: '红方' },
      blackPlayer: { type: 'human', name: '黑方' },
      gameMode: 'human-vs-human',
      result: 'incomplete',
    },
    initialFen: 'rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w',
    moves: [],
    currentIndex: 0,
  };
}

describe('GameRecordService validation and I/O errors', () => {
  let service: GameRecordService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete GameRecordService['instance'];
    service = GameRecordService.getInstance();
  });

  it('rejects invalid saves before opening a dialog or writing', async () => {
    const record = createRecord();
    record.version = '2.0';

    await expect(service.save(record)).resolves.toMatchObject({ success: false });
    expect(showSaveDialog).not.toHaveBeenCalled();
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects invalid exports before opening a dialog or writing', async () => {
    const record = createRecord();
    record.currentIndex = 1;

    await expect(service.export(record, 'PGN')).resolves.toMatchObject({ success: false });
    expect(showSaveDialog).not.toHaveBeenCalled();
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('rejects invalid autosaves without writing', () => {
    const record = createRecord();
    record.metadata.date = 'invalid';

    expect(() => service.autoSave(record)).toThrow('棋谱格式无效');
    expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
  });

  it('surfaces autosave write failures', () => {
    mockedFs.writeFileSync.mockImplementation(() => {
      throw new Error('disk full');
    });

    expect(() => service.autoSave(createRecord())).toThrow('disk full');
  });

  it('clears autosave after a successful manual save', async () => {
    mockedFs.writeFileSync.mockImplementation(() => undefined);
    mockedFs.unlinkSync.mockImplementation(() => undefined);
    showSaveDialog.mockResolvedValue({
      canceled: false,
      filePath: 'C:\\mock\\saved.json',
    });
    mockedFs.existsSync.mockReturnValue(true);

    await expect(service.save(createRecord())).resolves.toMatchObject({ success: true });
    expect(mockedFs.unlinkSync).toHaveBeenCalledWith(expect.stringContaining('autosave.json'));
  });

  it('surfaces autosave read failures and invalid records', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({
      mtime: new Date('2026-07-24T12:43:16.177Z'),
    } as fs.Stats);
    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('read failed');
    });
    expect(() => service.checkAutoSave()).toThrow('read failed');

    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.0' }));
    expect(() => service.checkAutoSave()).toThrow('自动保存棋谱格式无效');
  });

  it('surfaces autosave deletion failures', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.unlinkSync.mockImplementation(() => {
      throw new Error('delete failed');
    });

    expect(() => service.discardAutoSave()).toThrow('delete failed');
  });

  it('quarantines a corrupt autosave without deleting its data', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.renameSync.mockImplementation(() => undefined);

    const quarantinePath = service.quarantineAutoSave(
      new Date('2026-07-24T12:43:16.177Z')
    );

    expect(quarantinePath).toContain('autosave.corrupt.2026-07-24T12-43-16-177Z.json');
    expect(mockedFs.renameSync).toHaveBeenCalledWith(
      expect.stringContaining('autosave.json'),
      quarantinePath
    );
    expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
  });

  it('surfaces corrupt autosave quarantine failures', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.renameSync.mockImplementation(() => {
      throw new Error('access denied');
    });

    expect(() => service.quarantineAutoSave()).toThrow('access denied');
  });

  it('returns explicit load errors for invalid content and I/O failures', () => {
    mockedFs.existsSync.mockReturnValue(true);
    mockedFs.statSync.mockReturnValue({ size: 100 } as fs.Stats);
    mockedFs.readFileSync.mockReturnValue(JSON.stringify({ version: '2.0' }));
    expect(service.loadFromPath('bad.json')).toMatchObject({
      success: false,
      error: expect.stringContaining('棋谱格式无效'),
    });

    mockedFs.readFileSync.mockImplementation(() => {
      throw new Error('read failed');
    });
    expect(service.loadFromPath('bad.json')).toMatchObject({
      success: false,
      error: expect.stringContaining('read failed'),
    });
  });
});
