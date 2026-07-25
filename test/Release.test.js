const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  compareVersions,
  extractReleaseNotes,
  prepareChangelog,
  prepareRelease,
  validateChangelog,
} = require('../scripts/release.cjs');

function changelog({
  currentVersion = '1.2.3',
  previousVersion = '1.2.2',
  unreleasedItem = '- 改进发布流程。',
  currentItem = '- 当前版本内容。',
} = {}) {
  return `# 更新日志

## 未发布

### 主要更新

${unreleasedItem}

### 问题修复

### 安全与依赖

### 兼容性说明

## [${currentVersion}] - 2026-07-25

### 主要更新

${currentItem}

## [${previousVersion}] - 2026-07-24

### 问题修复

- 上一个版本内容。

[未发布]: https://github.com/example/project/compare/v${currentVersion}...HEAD
[${currentVersion}]: https://github.com/example/project/compare/v${previousVersion}...v${currentVersion}
[${previousVersion}]: https://github.com/example/project/releases/tag/v${previousVersion}
`;
}

describe('release metadata tooling', () => {
  test('compares strict semantic versions', () => {
    expect(compareVersions('1.2.4', '1.2.3')).toBeGreaterThan(0);
    expect(compareVersions('2.0.0', '1.99.99')).toBeGreaterThan(0);
    expect(compareVersions('1.2.3', '1.2.3')).toBe(0);
    expect(() => compareVersions('v1.2.3', '1.2.3')).toThrow('严格的 SemVer');
    expect(() => compareVersions('01.2.3', '1.2.3')).toThrow('严格的 SemVer');
  });

  test('validates the changelog and current package version', () => {
    const parsed = validateChangelog(changelog(), '1.2.3');
    expect(parsed.versions.map(({ version }) => version)).toEqual(['1.2.3', '1.2.2']);
  });

  test.each([
    ['缺少当前版本', '9.9.9', 'CHANGELOG 缺少当前 package 版本', null],
    ['正式版本说明为空', '1.2.3', '发布说明为空', { currentItem: '' }],
    ['占位说明', '1.2.3', '包含占位内容', { currentItem: '- TBD' }],
    ['重复版本', '1.2.3', '包含重复版本', null],
    ['版本顺序错误', '1.2.3', '必须按从新到旧排列', { previousVersion: '2.0.0' }],
  ])('rejects %s', (_name, packageVersion, message, options) => {
    let content = changelog(options ?? {});
    if (_name === '重复版本') {
      content = content.replace('## [1.2.2] - 2026-07-24', '## [1.2.3] - 2026-07-24');
    }
    expect(() => validateChangelog(content, packageVersion)).toThrow(message);
  });

  test('rejects invalid release dates and compare links', () => {
    expect(() =>
      validateChangelog(changelog().replace('2026-07-25', '2026-02-30'), '1.2.3')
    ).toThrow('日期无效');
    expect(() =>
      validateChangelog(
        changelog().replace('compare/v1.2.3...HEAD', 'compare/v1.2.2...HEAD'),
        '1.2.3'
      )
    ).toThrow('“未发布”链接必须是');
  });

  test('prepares a new version and restores an empty unreleased template', () => {
    const prepared = prepareChangelog(changelog(), '1.2.3', '1.3.0', '2026-07-26');
    expect(prepared).toContain('## [1.3.0] - 2026-07-26');
    expect(prepared).toContain('- 改进发布流程。');
    expect(prepared).toContain(
      '[未发布]: https://github.com/example/project/compare/v1.3.0...HEAD'
    );
    expect(prepared).toContain(
      '[1.3.0]: https://github.com/example/project/compare/v1.2.3...v1.3.0'
    );
    const parsed = validateChangelog(prepared, '1.3.0');
    expect(parsed.unreleased.sections.every((section) => section.items.length === 0)).toBe(true);
    expect(parsed.versions[0].sections.map((section) => section.name)).toEqual(['主要更新']);
  });

  test('rejects release preparation without unreleased content', () => {
    expect(() =>
      prepareChangelog(changelog({ unreleasedItem: '' }), '1.2.3', '1.2.4', '2026-07-26')
    ).toThrow('未发布区没有可发布内容');
  });

  test('rejects a release version that does not increase', () => {
    expect(() => prepareChangelog(changelog(), '1.2.3', '1.2.3', '2026-07-26')).toThrow(
      '必须高于当前版本'
    );
  });

  test('extracts only the requested release notes and compare link', () => {
    const notes = extractReleaseNotes(changelog(), '1.2.3', '1.2.3');
    expect(notes).toContain('### 主要更新');
    expect(notes).toContain('- 当前版本内容。');
    expect(notes).toContain('compare/v1.2.2...v1.2.3');
    expect(notes).not.toContain('上一个版本内容');
  });

  test('updates package and lock versions without creating git metadata', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'feijiang-release-'));
    try {
      fs.writeFileSync(
        path.join(root, 'package.json'),
        JSON.stringify({ name: 'release-fixture', version: '1.2.3' }, null, 2)
      );
      fs.writeFileSync(
        path.join(root, 'package-lock.json'),
        JSON.stringify(
          {
            name: 'release-fixture',
            version: '1.2.3',
            lockfileVersion: 3,
            requires: true,
            packages: { '': { name: 'release-fixture', version: '1.2.3' } },
          },
          null,
          2
        )
      );
      fs.writeFileSync(path.join(root, 'CHANGELOG.md'), changelog());

      prepareRelease(root, '1.2.4', '2026-07-26');

      expect(JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version).toBe(
        '1.2.4'
      );
      const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
      expect(lock.version).toBe('1.2.4');
      expect(lock.packages[''].version).toBe('1.2.4');
      expect(fs.existsSync(path.join(root, '.git'))).toBe(false);
      expect(
        validateChangelog(fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8'), '1.2.4')
      ).toBeDefined();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
