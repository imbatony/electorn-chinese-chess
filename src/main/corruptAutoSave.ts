interface QuarantineResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

export type CorruptAutoSaveAction = 'quarantine' | 'keep' | 'cancel';

export interface CorruptAutoSaveDecision {
  proceed: boolean;
  quarantine?: QuarantineResult;
}

export function resolveCorruptAutoSave(
  action: CorruptAutoSaveAction,
  quarantine: () => string
): CorruptAutoSaveDecision {
  if (action === 'keep') return { proceed: true };
  if (action === 'cancel') return { proceed: false };

  try {
    return {
      proceed: true,
      quarantine: { success: true, filePath: quarantine() },
    };
  } catch (error) {
    return {
      proceed: false,
      quarantine: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}
