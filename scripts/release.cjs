const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERSION_NUMBER = '(?:0|[1-9]\\d*)';
const VERSION_PATTERN = new RegExp(`^${VERSION_NUMBER}\\.${VERSION_NUMBER}\\.${VERSION_NUMBER}$`);
const VERSION_HEADING_PATTERN = new RegExp(
  `^## \\[(${VERSION_NUMBER}\\.${VERSION_NUMBER}\\.${VERSION_NUMBER})\\] - (\\d{4}-\\d{2}-\\d{2})$`
);
const EXPECTED_SECTIONS = ['主要更新', '问题修复', '安全与依赖', '兼容性说明'];
const PLACEHOLDER_PATTERN = /\b(?:TBD|TODO)\b|待补充|稍后补充|待定|占位|暂无/u;

function normalizeNewlines(content) {
  return content.replace(/\r\n?/g, '\n');
}

function parseVersion(version) {
  if (!VERSION_PATTERN.test(version)) {
    throw new Error(`版本号必须是严格的 SemVer（X.Y.Z）：${version}`);
  }
  const parts = version.split('.').map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part))) {
    throw new Error(`版本号超出安全整数范围：${version}`);
  }
  return parts;
}

function compareVersions(left, right) {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) {
      return leftParts[index] - rightParts[index];
    }
  }
  return 0;
}

function isValidDate(value) {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function parseSections(body, label) {
  const lines = body.split('\n');
  const sections = [];
  let current;

  for (const line of lines) {
    const heading = /^### (.+)$/.exec(line);
    if (heading) {
      current = { name: heading[1].trim(), items: [] };
      sections.push(current);
      continue;
    }
    if (/^- \S/.test(line)) {
      if (!current) {
        throw new Error(`${label} 的条目必须位于三级分类标题下`);
      }
      current.items.push(line.slice(2).trim());
    } else if (line.trim() && !current) {
      throw new Error(`${label} 在分类标题前包含无法识别的内容`);
    } else if (line.trim()) {
      throw new Error(`${label} 的分类内容必须使用 Markdown 列表`);
    }
  }

  const names = sections.map((section) => section.name);
  if (new Set(names).size !== names.length) {
    throw new Error(`${label} 包含重复分类`);
  }
  for (const name of names) {
    if (!EXPECTED_SECTIONS.includes(name)) {
      throw new Error(`${label} 包含不支持的分类：${name}`);
    }
  }
  return sections;
}

function parseChangelog(content) {
  const normalized = normalizeNewlines(content);
  const lines = normalized.split('\n');
  const headings = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index] === '## 未发布') {
      headings.push({ type: 'unreleased', index });
      continue;
    }
    const match = VERSION_HEADING_PATTERN.exec(lines[index]);
    if (match) {
      headings.push({ type: 'version', index, version: match[1], date: match[2] });
    } else if (lines[index].startsWith('## ')) {
      throw new Error(`无法识别的二级标题：${lines[index]}`);
    }
  }

  const unreleasedHeadings = headings.filter((heading) => heading.type === 'unreleased');
  if (unreleasedHeadings.length !== 1) {
    throw new Error('CHANGELOG 必须且只能包含一个“## 未发布”标题');
  }
  if (headings[0]?.type !== 'unreleased') {
    throw new Error('“未发布”必须位于所有正式版本之前');
  }

  const blocks = headings.map((heading, headingIndex) => {
    const nextHeading = headings[headingIndex + 1];
    const rawBody = lines
      .slice(heading.index + 1, nextHeading?.index ?? lines.length)
      .filter((line) => !/^\[[^\]]+\]:\s+https?:\/\//.test(line))
      .join('\n')
      .trim();
    const label = heading.type === 'unreleased' ? '未发布区' : `版本 ${heading.version}`;
    return {
      ...heading,
      body: rawBody,
      sections: parseSections(rawBody, label),
    };
  });

  const links = new Map();
  for (const line of lines) {
    const match = /^\[([^\]]+)\]:\s+(https?:\/\/\S+)$/.exec(line);
    if (match) {
      links.set(match[1], match[2]);
    }
  }

  return {
    normalized,
    unreleased: blocks[0],
    versions: blocks.filter((block) => block.type === 'version'),
    links,
  };
}

function assertNoPlaceholders(block, label) {
  if (PLACEHOLDER_PATTERN.test(block.body)) {
    throw new Error(`${label} 包含占位内容`);
  }
}

function countItems(block) {
  return block.sections.reduce((count, section) => count + section.items.length, 0);
}

function validateChangelog(content, packageVersion) {
  parseVersion(packageVersion);
  const parsed = parseChangelog(content);
  const unreleasedNames = parsed.unreleased.sections.map((section) => section.name);
  if (
    unreleasedNames.length !== EXPECTED_SECTIONS.length ||
    !EXPECTED_SECTIONS.every((name, index) => unreleasedNames[index] === name)
  ) {
    throw new Error(`未发布区必须依次包含：${EXPECTED_SECTIONS.join('、')}`);
  }
  assertNoPlaceholders(parsed.unreleased, '未发布区');

  const seen = new Set();
  parsed.versions.forEach((version, index) => {
    if (seen.has(version.version)) {
      throw new Error(`CHANGELOG 包含重复版本：${version.version}`);
    }
    seen.add(version.version);
    if (!isValidDate(version.date)) {
      throw new Error(`版本 ${version.version} 的日期无效：${version.date}`);
    }
    if (countItems(version) === 0) {
      throw new Error(`版本 ${version.version} 的发布说明为空`);
    }
    assertNoPlaceholders(version, `版本 ${version.version}`);
    if (index > 0 && compareVersions(parsed.versions[index - 1].version, version.version) <= 0) {
      throw new Error('CHANGELOG 正式版本必须按从新到旧排列');
    }
    if (!parsed.links.has(version.version)) {
      throw new Error(`版本 ${version.version} 缺少链接定义`);
    }
  });

  if (!seen.has(packageVersion)) {
    throw new Error(`CHANGELOG 缺少当前 package 版本 ${packageVersion}`);
  }
  if (parsed.versions[0]?.version !== packageVersion) {
    throw new Error(`CHANGELOG 最新正式版本必须与 package 版本 ${packageVersion} 一致`);
  }
  if (!parsed.links.has('未发布')) {
    throw new Error('CHANGELOG 缺少“未发布”链接定义');
  }
  const unreleasedLink = parsed.links.get('未发布');
  const repositoryMatch = /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/compare\//.exec(unreleasedLink);
  if (!repositoryMatch) {
    throw new Error('“未发布”链接必须是 GitHub compare 链接');
  }
  const repository = repositoryMatch[1];
  const expectedUnreleasedLink = `${repository}/compare/v${packageVersion}...HEAD`;
  if (unreleasedLink !== expectedUnreleasedLink) {
    throw new Error(`“未发布”链接必须是 ${expectedUnreleasedLink}`);
  }
  parsed.versions.slice(0, -1).forEach((version, index) => {
    const previousVersion = parsed.versions[index + 1].version;
    const expectedLink = `${repository}/compare/v${previousVersion}...v${version.version}`;
    if (parsed.links.get(version.version) !== expectedLink) {
      throw new Error(`版本 ${version.version} 的链接必须是 ${expectedLink}`);
    }
  });
  return parsed;
}

function readVersionFiles(root) {
  const packagePath = path.join(root, 'package.json');
  const lockPath = path.join(root, 'package-lock.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const lockJson = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  const lockRootVersion = lockJson.packages?.['']?.version;
  if (packageJson.version !== lockJson.version || packageJson.version !== lockRootVersion) {
    throw new Error('package.json 与 package-lock.json 的版本不一致');
  }
  return { version: packageJson.version, packagePath, lockPath };
}

function checkRelease(root = process.cwd()) {
  const { version } = readVersionFiles(root);
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
  return validateChangelog(changelog, version);
}

function renderUnreleasedTemplate() {
  return ['## 未发布', '', ...EXPECTED_SECTIONS.flatMap((section) => [`### ${section}`, ''])]
    .join('\n')
    .trimEnd();
}

function renderReleaseSections(block) {
  return block.sections
    .filter((section) => section.items.length > 0)
    .map(
      (section) => `### ${section.name}\n\n${section.items.map((item) => `- ${item}`).join('\n')}`
    )
    .join('\n\n');
}

function prepareChangelog(content, currentVersion, nextVersion, date) {
  const parsed = validateChangelog(content, currentVersion);
  parseVersion(nextVersion);
  if (compareVersions(nextVersion, currentVersion) <= 0) {
    throw new Error(`新版本 ${nextVersion} 必须高于当前版本 ${currentVersion}`);
  }
  if (!isValidDate(date)) {
    throw new Error(`发布日期无效：${date}`);
  }
  if (parsed.versions.some((version) => version.version === nextVersion)) {
    throw new Error(`CHANGELOG 已包含版本 ${nextVersion}`);
  }
  if (countItems(parsed.unreleased) === 0) {
    throw new Error('未发布区没有可发布内容');
  }
  assertNoPlaceholders(parsed.unreleased, '未发布区');

  const unreleasedStart = parsed.normalized.indexOf('## 未发布');
  const currentHeading = `## [${currentVersion}] - `;
  const currentStart = parsed.normalized.indexOf(currentHeading, unreleasedStart);
  if (currentStart < 0) {
    throw new Error(`找不到当前版本 ${currentVersion} 的标题`);
  }

  const releaseBlock = `## [${nextVersion}] - ${date}\n\n${renderReleaseSections(parsed.unreleased)}`;
  let updated =
    parsed.normalized.slice(0, unreleasedStart) +
    `${renderUnreleasedTemplate()}\n\n${releaseBlock}\n\n` +
    parsed.normalized.slice(currentStart);

  const unreleasedLink = parsed.links.get('未发布');
  const currentLink = parsed.links.get(currentVersion);
  if (!unreleasedLink || !currentLink) {
    throw new Error('CHANGELOG 缺少生成新版本链接所需的链接定义');
  }
  const repositoryMatch = /^(https:\/\/github\.com\/[^/]+\/[^/]+)\/compare\//.exec(unreleasedLink);
  if (!repositoryMatch) {
    throw new Error('“未发布”链接必须是 GitHub compare 链接');
  }
  const repository = repositoryMatch[1];
  updated = updated.replace(
    /^\[未发布\]:.+$/m,
    `[未发布]: ${repository}/compare/v${nextVersion}...HEAD`
  );
  updated = updated.replace(
    new RegExp(`^\\[${currentVersion.replace(/\./g, '\\.')}\\]:`, 'm'),
    `[${nextVersion}]: ${repository}/compare/v${currentVersion}...v${nextVersion}\n[${currentVersion}]:`
  );
  return `${updated.trimEnd()}\n`;
}

function prepareRelease(root, nextVersion, date = new Date().toISOString().slice(0, 10)) {
  const versionFiles = readVersionFiles(root);
  const changelogPath = path.join(root, 'CHANGELOG.md');
  const originalPackage = fs.readFileSync(versionFiles.packagePath, 'utf8');
  const originalLock = fs.readFileSync(versionFiles.lockPath, 'utf8');
  const originalChangelog = fs.readFileSync(changelogPath, 'utf8');
  const updatedChangelog = prepareChangelog(
    originalChangelog,
    versionFiles.version,
    nextVersion,
    date
  );

  const npmExecPath = process.env.npm_execpath;
  if (!npmExecPath) {
    throw new Error('找不到 npm CLI；请通过 npm run release:prepare 执行发布准备');
  }
  const result = spawnSync(
    process.execPath,
    [npmExecPath, 'version', nextVersion, '--no-git-tag-version', '--ignore-scripts'],
    { cwd: root, encoding: 'utf8', stdio: 'pipe' }
  );
  if (result.error || result.status !== 0) {
    fs.writeFileSync(versionFiles.packagePath, originalPackage);
    fs.writeFileSync(versionFiles.lockPath, originalLock);
    throw new Error(
      result.error?.message ||
        result.stderr?.trim() ||
        result.stdout?.trim() ||
        'npm version 执行失败'
    );
  }

  try {
    fs.writeFileSync(changelogPath, updatedChangelog);
    checkRelease(root);
  } catch (error) {
    fs.writeFileSync(versionFiles.packagePath, originalPackage);
    fs.writeFileSync(versionFiles.lockPath, originalLock);
    fs.writeFileSync(changelogPath, originalChangelog);
    throw error;
  }
}

function extractReleaseNotes(content, packageVersion, targetVersion) {
  const parsed = validateChangelog(content, packageVersion);
  const release = parsed.versions.find((version) => version.version === targetVersion);
  if (!release) {
    throw new Error(`CHANGELOG 缺少版本 ${targetVersion}`);
  }
  const link = parsed.links.get(targetVersion);
  return `${release.body}\n\n**完整变更**：${link}\n`;
}

function printUsage() {
  console.error(
    '用法：node scripts/release.cjs <check|prepare|notes> [version] [output] [--date YYYY-MM-DD]'
  );
}

function main(args = process.argv.slice(2), root = process.cwd()) {
  const [command] = args;
  if (command === 'check') {
    const parsed = checkRelease(root);
    console.log(`Release 元数据有效，当前版本 ${parsed.versions[0].version}`);
    return;
  }
  if (command === 'prepare') {
    const version = args[1];
    const dateIndex = args.indexOf('--date');
    const date = dateIndex >= 0 ? args[dateIndex + 1] : undefined;
    if (!version || (dateIndex >= 0 && !date)) {
      printUsage();
      process.exitCode = 1;
      return;
    }
    prepareRelease(root, version, date);
    console.log(`已准备 v${version}；请审阅改动并创建 Release PR。`);
    return;
  }
  if (command === 'notes') {
    const version = args[1];
    const output = args[2];
    if (!version || !output) {
      printUsage();
      process.exitCode = 1;
      return;
    }
    const { version: packageVersion } = readVersionFiles(root);
    const content = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8');
    const notes = extractReleaseNotes(content, packageVersion, version);
    fs.mkdirSync(path.dirname(path.resolve(root, output)), { recursive: true });
    fs.writeFileSync(path.resolve(root, output), notes);
    console.log(`已提取 v${version} 发布说明到 ${output}`);
    return;
  }
  printUsage();
  process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Release 校验失败：${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  EXPECTED_SECTIONS,
  compareVersions,
  extractReleaseNotes,
  parseChangelog,
  prepareChangelog,
  prepareRelease,
  validateChangelog,
};
