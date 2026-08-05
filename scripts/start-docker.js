const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let activeTunnel;

function readEnvValue(filePath, key) {
  if (!fs.existsSync(filePath)) return '';
  const line = fs.readFileSync(filePath, 'utf8').split(/\r?\n/).find((item) => item.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : '';
}

async function waitForNewTunnel(previous) {
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    const current = {
      api: readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'APP_BASE_URL'),
      crm: readEnvValue(path.join(rootDir, 'apps/zalo-crm-backend/.env'), 'APP_BASE_URL'),
      keycloak: readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'KEYCLOAK_URL'),
    };
    if (
      Object.values(current).every((value) => value.includes('.trycloudflare.com')) &&
      Object.keys(current).every((key) => current[key] !== previous[key])
    ) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('Timed out waiting for new Quick Tunnel URLs.');
}

function runDocker() {
  const result = spawnSync('docker', ['compose', 'up', '-d', '--build', '--force-recreate', 'backend', 'crm-backend', 'keycloak'], {
    cwd: rootDir,
    stdio: 'inherit',
    windowsHide: false,
  });
  if (result.status !== 0) {
    throw new Error(`docker compose failed with code ${result.status}.`);
  }
}

async function waitForService(name, url) {
  // Keycloak may run a Quarkus augmentation on a fresh Docker start.
  // Allow enough time for that one-time initialization to finish.
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    try {
      const response = await fetch(url);
      // A 401/404 still proves the HTTP server is alive. Only transport
      // failures mean the container is not ready yet.
      if (response.status < 500) {
        console.log(`[DOCKER] ${name} is ready (${response.status}).`);
        return;
      }
    } catch {
      // The service is still starting; retry below.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`${name} did not become reachable within 120 seconds.`);
}

async function main() {
  const previous = {
    api: readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'APP_BASE_URL'),
    crm: readEnvValue(path.join(rootDir, 'apps/zalo-crm-backend/.env'), 'APP_BASE_URL'),
    keycloak: readEnvValue(path.join(rootDir, 'apps/backend/.env'), 'KEYCLOAK_URL'),
  };
  const tunnelCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const tunnel = spawn(tunnelCommand, ['tunnel'], {
    cwd: rootDir,
    stdio: 'inherit',
    windowsHide: false,
    shell: process.platform === 'win32',
  });
  activeTunnel = tunnel;

  const stop = () => {
    if (!tunnel.killed) tunnel.kill();
  };
  process.once('SIGINT', () => { stop(); process.exit(130); });
  process.once('SIGTERM', () => { stop(); process.exit(143); });

  await waitForNewTunnel(previous);
  console.log('[DOCKER] Tunnel URLs updated. Starting backend containers...');
  runDocker();
  await Promise.all([
    waitForService('Keycloak', 'http://127.0.0.1:8080/realms/shopquiet'),
    // The backend intentionally has no /api/v1 index route. Its root route
    // is excluded from the global prefix and is a better readiness probe.
    waitForService('Backend', 'http://127.0.0.1:3000/'),
    waitForService('CRM backend', 'http://127.0.0.1:3002/api/v1'),
  ]);
  console.log('[DOCKER] Backend, CRM backend and Keycloak are ready. Keep this window open.');
}

main().catch((error) => {
  console.error(`[ERROR] ${error.message}`);
  if (activeTunnel && !activeTunnel.killed) {
    activeTunnel.kill();
  }
  process.exitCode = 1;
});
