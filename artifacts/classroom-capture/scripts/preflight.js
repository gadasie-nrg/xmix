const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');

function findWorkspaceRoot(startDir) {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error('Could not find the pnpm workspace root.');
}

const workspaceRoot = findWorkspaceRoot(projectRoot);

function printRecoveryMessage() {
  console.error(
    [
      '',
      'Xmix Capture workspace links are missing or broken.',
      'From the repository root, run the supported workspace recovery:',
      '  pnpm install --frozen-lockfile',
      '',
      'Then rerun:',
      '  pnpm --filter @workspace/classroom-capture preflight',
    ].join('\n'),
  );
}

function validateFrozenLockfile() {
  console.log('Validating the frozen pnpm lockfile...');

  const result = spawnSync(
    'pnpm',
    ['install', '--frozen-lockfile', '--lockfile-only', '--ignore-scripts'],
    {
      cwd: workspaceRoot,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    console.error(`Could not run pnpm: ${result.error.message}`);
    printRecoveryMessage();
    return false;
  }

  if (result.status !== 0) {
    console.error('Frozen lockfile validation failed.');
    printRecoveryMessage();
    return false;
  }

  return true;
}

function checkWorkspaceLinks() {
  const checks = [
    {
      label: 'Expo CLI',
      relativePath: 'node_modules/.bin/expo',
    },
    {
      label: 'Expo TypeScript base config',
      relativePath: 'node_modules/expo/tsconfig.base.json',
    },
    {
      label: 'Vitest test runner',
      relativePath: 'node_modules/.bin/vitest',
    },
  ];

  const missingLinks = checks.filter(({ relativePath }) => {
    const linkPath = path.join(projectRoot, relativePath);

    try {
      fs.realpathSync(linkPath);
      return false;
    } catch {
      return true;
    }
  });

  if (missingLinks.length > 0) {
    console.error(
      `Missing workspace link${missingLinks.length === 1 ? '' : 's'}:`,
    );
    for (const { label, relativePath } of missingLinks) {
      console.error(`  - ${label}: ${relativePath}`);
    }
    printRecoveryMessage();
    return false;
  }

  console.log('Expo CLI, TypeScript base config, and Vitest links are ready.');
  return true;
}

function main() {
  if (!validateFrozenLockfile() || !checkWorkspaceLinks()) {
    process.exitCode = 1;
    return;
  }

  console.log('Xmix Capture is ready for QR testing.');
}

main();