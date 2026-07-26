export const ENGINE_DIFFICULTIES = [1, 2, 3] as const;

export type EngineDifficulty = (typeof ENGINE_DIFFICULTIES)[number];

export const FALLBACK_SEARCH_TIME_MS: Record<EngineDifficulty, number> = {
  1: 500,
  2: 1500,
  3: 3000,
};

export const PIKAFISH_SEARCH_NODES: Record<EngineDifficulty, number> = {
  // 官方 Pikafish 2026 实测初始局面约对应 10、14、21 层。
  1: 10_000,
  2: 100_000,
  3: 1_000_000,
};

export function isEngineDifficulty(value: unknown): value is EngineDifficulty {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    ENGINE_DIFFICULTIES.includes(value as EngineDifficulty)
  );
}
