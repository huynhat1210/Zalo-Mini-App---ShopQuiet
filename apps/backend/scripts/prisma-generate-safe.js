const { spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.resolve(__dirname, '..');
const isWindows = process.platform === 'win32';
const prismaArgs = isWindows
  ? ['/d', '/s', '/c', 'npx prisma generate --schema prisma/schema.prisma']
  : ['prisma', 'generate', '--schema', 'prisma/schema.prisma'];
const npxCommand = isWindows ? 'cmd.exe' : 'npx';

function runPrismaGenerate() {
  console.log('Prisma generate...');

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
