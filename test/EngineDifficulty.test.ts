import { PIKAFISH_SEARCH_NODES } from '../src/common/EngineDifficulty';
import { parseEngineOptionLine } from '../src/main/UCCI';
import { EngineOption } from '../src/main/engine-types';
import { buildDifficultyPlan } from '../src/main/engineDifficulty';

const option = (value: EngineOption): EngineOption => value;

describe('engine difficulty strategy', () => {
  it('parses UCI spin options with multi-word names', () => {
    expect(
      parseEngineOptionLine('option name Skill Level type spin default 20 min 0 max 20')
    ).toEqual({
      name: 'Skill Level',
      type: 'spin',
      default: '20',
      min: 0,
      max: 20,
    });
  });

  it('parses UCCI combo options and values', () => {
    expect(
      parseEngineOptionLine(
        'option knowledge type combo var none var small var medium var large default large'
      )
    ).toEqual({
      name: 'knowledge',
      type: 'combo',
      default: 'large',
      values: ['none', 'small', 'medium', 'large'],
    });
  });

  it('preserves multi-word combo values', () => {
    expect(
      parseEngineOptionLine(
        'option name Playing Style type combo default Very Solid var Very Solid var Normal Play'
      )
    ).toEqual({
      name: 'Playing Style',
      type: 'combo',
      default: 'Very Solid',
      values: ['Very Solid', 'Normal Play'],
    });
  });

  it.each([1, 2, 3] as const)('uses a Pikafish node limit for difficulty %s', (difficulty) => {
    const plan = buildDifficultyPlan('Pikafish 2026', 'uci', [], difficulty, 3000);

    expect(plan.commands).toEqual([]);
    expect(plan.search).toEqual({
      kind: 'nodes',
      value: PIKAFISH_SEARCH_NODES[difficulty],
      maxTime: 3000,
    });
  });

  it('does not limit Pikafish in unrestricted modes', () => {
    expect(buildDifficultyPlan('Pikafish 2026', 'uci', [], null, 3000)).toEqual({
      commands: [],
      search: { kind: 'time', value: 3000 },
    });
  });

  it('prefers declared UCI Elo controls for non-Pikafish engines', () => {
    const options = [
      option({ name: 'UCI_LimitStrength', type: 'check', default: 'false' }),
      option({ name: 'UCI_Elo', type: 'spin', default: '2000', min: 1000, max: 3000 }),
    ];

    expect(buildDifficultyPlan('Other Engine', 'uci', options, 2, 3000).commands).toEqual([
      'setoption name UCI_LimitStrength value true',
      'setoption name UCI_Elo value 2000',
    ]);
    expect(buildDifficultyPlan('Other Engine', 'uci', options, null, 3000).commands).toEqual([
      'setoption name UCI_LimitStrength value false',
    ]);
  });

  it.each([
    [1, 0],
    [2, 10],
    [3, 20],
  ] as const)('maps Skill Level difficulty %s to %s', (difficulty, value) => {
    const options = [option({ name: 'Skill Level', type: 'spin', default: '20', min: 0, max: 20 })];

    expect(buildDifficultyPlan('GGChess', 'uci', options, difficulty, 3000).commands).toEqual([
      `setoption name Skill Level value ${value}`,
    ]);
  });

  it.each([
    [1, 'none', 'large'],
    [2, 'medium', 'small'],
    [3, 'large', 'none'],
  ] as const)(
    'maps ElephantEye difficulty %s to knowledge %s and randomness %s',
    (difficulty, knowledge, randomness) => {
      const options = [
        option({
          name: 'knowledge',
          type: 'combo',
          default: 'large',
          values: ['none', 'small', 'medium', 'large'],
        }),
        option({
          name: 'randomness',
          type: 'combo',
          default: 'none',
          values: ['none', 'small', 'medium', 'large'],
        }),
      ];

      expect(
        buildDifficultyPlan('ElephantEye', 'ucci', options, difficulty, 3000).commands
      ).toEqual([`setoption knowledge ${knowledge}`, `setoption randomness ${randomness}`]);
    }
  );

  it.each([
    [1, 500],
    [2, 1500],
    [3, 3000],
  ] as const)('uses distinct time fallback for difficulty %s', (difficulty, time) => {
    expect(buildDifficultyPlan('SA Chess', 'uci', [], difficulty, 3000).search).toEqual({
      kind: 'time',
      value: time,
    });
  });
});
