import { resolveCorruptAutoSave } from '../src/main/corruptAutoSave';

describe('corrupt autosave decisions', () => {
  it('allows quit only after the corrupt autosave is quarantined', () => {
    expect(resolveCorruptAutoSave('quarantine', () => 'autosave.corrupt.json')).toEqual({
      proceed: true,
      quarantine: {
        success: true,
        filePath: 'autosave.corrupt.json',
      },
    });
  });

  it('keeps the app open when quarantine fails', () => {
    expect(
      resolveCorruptAutoSave('quarantine', () => {
        throw new Error('access denied');
      })
    ).toEqual({
      proceed: false,
      quarantine: {
        success: false,
        error: 'access denied',
      },
    });
  });

  it('does not touch the file when the user cancels exit', () => {
    const quarantine = jest.fn();

    expect(resolveCorruptAutoSave('cancel', quarantine)).toEqual({ proceed: false });
    expect(quarantine).not.toHaveBeenCalled();
  });

  it('allows startup to continue when the user explicitly keeps the file', () => {
    const quarantine = jest.fn();

    expect(resolveCorruptAutoSave('keep', quarantine)).toEqual({ proceed: true });
    expect(quarantine).not.toHaveBeenCalled();
  });
});
