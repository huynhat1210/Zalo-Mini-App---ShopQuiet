const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(backendDir, '..', '..');
const isWindows = process.platform === 'win32';
const prismaArgs = isWindows
  ? ['/d', '/s', '/c', 'npx prisma generate --schema prisma/schema.prisma']
  : ['prisma', 'generate', '--schema', 'prisma/schema.prisma'];
const npxCommand = isWindows ? 'cmd.exe' : 'npx';

function removeIfExists(targetPath) {
  if (!targetPath || !fs.existsSync(targetPath)) {
    return;
  }

  fs.rmSync(targetPath, { recursive: true, force: true });
}

function clearPrismaCaches(startPath) {
  if (!fs.existsSync(startPath)) {
    return;
  }

  const stack = [startPath];
  const visited = new Set();

  while (stack.length > 0) {
    const currentPath = stack.pop();
    if (!currentPath || visited.has(currentPath)) {
      continue;
    }

    visited.add(currentPath);

    let entries;
    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.prisma') {
          removeIfExists(path.join(entryPath, 'client'));
          continue;
        }

        if (entry.name === 'node_modules' || entry.name === '.pnpm') {
          stack.push(entryPath);
          continue;
        }

        stack.push(entryPath);
      }
    }
  }
}

function runPrismaGenerate() {
  console.log('Prisma generate (with engine)...');
  clearPrismaCaches(path.join(workspaceRoot, 'node_modules'));
  clearPrismaCaches(path.join(backendDir, 'node_modules'));

  const generateArgs = isWindows
    ? ['/d', '/s', '/c', 'npx prisma generate --schema prisma/schema.prisma']
    : ['prisma', 'generate', '--schema', 'prisma/schema.prisma'];

  const result = spawnSync(npxCommand, generateArgs, {
    cwd: backendDir,
    stdio: 'inherit',
    env: process.env,
    shell: isWindows,
  });

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  if (result.status === 0) {
    process.exit(0);
  }

  process.exit(1);
}

runPrismaGenerate();
