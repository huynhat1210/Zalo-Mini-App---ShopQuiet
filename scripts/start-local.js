const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const children = [];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    windowsHide: false,
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with code ${result.status}.`);
  }
}

function start(command, args) {
  const child = spawn(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    windowsHide: false,
    shell: process.platform === 'win32',
  });
  children.push(child);
  child.once('error', (error) => console.error(`[ERROR] ${command}: ${error.message}`));
  return child;
}

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const line = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).find((item) => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

async function waitForTunnelConfig(previous) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const apiUrl = readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'APP_BASE_URL');
    const crmUrl = readEnvValue(path.join(rootDir, 'apps/zalo-crm-backend/.env'), 'APP_BASE_URL');
    const keycloakUrl = readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'KEYCLOAK_URL');
    if (
      [apiUrl, crmUrl, keycloakUrl].every((value) => value.includes('.trycloudflare.com')) &&
      apiUrl !== previous.apiUrl && crmUrl !== previous.crmUrl && keycloakUrl !== previous.keycloakUrl
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for pnpm tunnel to update the environment files.');
}

function stopAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

async function main() {
  process.once('SIGINT', () => { stopAll(); process.exit(130); });
  process.once('SIGTERM', () => { stopAll(); process.exit(143); });

  console.log('[LOCAL] Starting Keycloak Docker container...');
  run('docker', ['compose', 'up', '-d', 'keycloak']);

  console.log('[LOCAL] Starting Quick Tunnels...');
  const previous = {
    apiUrl: readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'APP_BASE_URL'),
    crmUrl: readEnvValue(path.join(rootDir, 'apps/zalo-crm-backend/.env'), 'APP_BASE_URL'),
    keycloakUrl: readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'KEYCLOAK_URL'),
  };
  start(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['tunnel']);
  await waitForTunnelConfig(previous);

  console.log('[LOCAL] Tunnel URLs are ready. Starting application services...');
  start(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['dev:backend']);
  start(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['dev:crm']);
  start(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['dev:cms']);
  start(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['dev:crm-fe']);
  start(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['dev:zalo']);

  console.log('\n[LOCAL] All services started. Keep this window open.');
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  stopAll();
  process.exitCode = 1;
});
