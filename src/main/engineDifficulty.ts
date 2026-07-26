import {
  EngineDifficulty,
  FALLBACK_SEARCH_TIME_MS,
  PIKAFISH_SEARCH_NODES,
} from '../common/EngineDifficulty';

import { EngineOption } from './engine-types';

export type SearchLimit =
  | { kind: 'time'; value: number }
  | { kind: 'nodes'; value: number; maxTime: number };

export interface DifficultyPlan {
  commands: string[];
  search: SearchLimit;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function findOption(options: EngineOption[], name: string): EngineOption | undefined {
  const normalizedName = normalize(name);
  return options.find((option) => normalize(option.name) === normalizedName);
}

function clampSpin(option: EngineOption, value: number): number {
  return Math.min(option.max ?? value, Math.max(option.min ?? value, value));
}

function valueAt(option: EngineOption, difficulty: EngineDifficulty): number | undefined {
  if (option.type !== 'spin' || option.min === undefined || option.max === undefined) {
    return undefined;
  }
  if (difficulty === 1) return option.min;
  if (difficulty === 3) return option.max;
  return Math.round((option.min + option.max) / 2);
}

function comboValue(option: EngineOption, preferred: string[]): string | undefined {
  for (const candidate of preferred) {
    const value = option.values?.find((item) => normalize(item) === candidate);
    if (value) return value;
  }
  return undefined;
}

function uciSetOption(option: EngineOption, value: string | number | boolean): string {
  return `setoption name ${option.name} value ${value}`;
}

function ucciSetOption(option: EngineOption, value: string | number | boolean): string {
  return `setoption ${option.name} ${value}`;
}

function fullTime(maxTime: number): SearchLimit {
  return { kind: 'time', value: maxTime };
}

export function buildDifficultyPlan(
  engineName: string,
  protocol: 'ucci' | 'uci',
  options: EngineOption[],
  difficulty: EngineDifficulty | null,
  maxTime: number
): DifficultyPlan {
  if (protocol === 'uci' && normalize(engineName).includes('pikafish')) {
    return {
      commands: [],
      search:
        difficulty === null
          ? fullTime(maxTime)
          : {
              kind: 'nodes',
              value: PIKAFISH_SEARCH_NODES[difficulty],
              maxTime,
            },
    };
  }

  if (protocol === 'uci') {
    const limitStrength = findOption(options, 'UCI_LimitStrength');
    const elo = findOption(options, 'UCI_Elo');
    if (limitStrength?.type === 'check' && elo?.type === 'spin') {
      if (difficulty === null) {
        return {
          commands: [uciSetOption(limitStrength, false)],
          search: fullTime(maxTime),
        };
      }
      const value = valueAt(elo, difficulty);
      if (value !== undefined) {
        return {
          commands: [uciSetOption(limitStrength, true), uciSetOption(elo, value)],
          search: fullTime(maxTime),
        };
      }
    }

    const skillLevel = findOption(options, 'Skill Level');
    if (skillLevel?.type === 'spin') {
      const value =
        difficulty === null
          ? clampSpin(skillLevel, skillLevel.max ?? Number(skillLevel.default))
          : valueAt(skillLevel, difficulty);
      if (value !== undefined && Number.isFinite(value)) {
        return {
          commands: [uciSetOption(skillLevel, value)],
          search: fullTime(maxTime),
        };
      }
    }
  } else {
    const knowledge = findOption(options, 'knowledge');
    const randomness = findOption(options, 'randomness');
    if (knowledge?.type === 'combo' && randomness?.type === 'combo') {
      const level = difficulty ?? 3;
      const knowledgeValue =
        level === 1
          ? comboValue(knowledge, ['none', 'small'])
          : level === 2
            ? comboValue(knowledge, ['medium', 'small', 'large'])
            : comboValue(knowledge, ['large', 'medium']);
      const randomnessValue =
        level === 1
          ? comboValue(randomness, ['large', 'medium'])
          : level === 2
            ? comboValue(randomness, ['small', 'medium', 'none'])
            : comboValue(randomness, ['none', 'small']);
      if (knowledgeValue && randomnessValue) {
        return {
          commands: [
            ucciSetOption(knowledge, knowledgeValue),
            ucciSetOption(randomness, randomnessValue),
          ],
          search: fullTime(maxTime),
        };
      }
    }
  }

  return {
    commands: [],
    search:
      difficulty === null
        ? fullTime(maxTime)
        : {
            kind: 'time',
            value: Math.min(maxTime, FALLBACK_SEARCH_TIME_MS[difficulty]),
          },
  };
}
