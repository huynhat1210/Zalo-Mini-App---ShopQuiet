const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const processes = [];

function updateEnvFile(filePath, key, value) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  const line = `${key}=${value}`;
  const expression = new RegExp(`^${key}=.*$`, 'm');
  content = expression.test(content)
    ? content.replace(expression, line)
    : `${content.trimEnd()}\n${line}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

function updateProjectEnvs(mainUrl, crmUrl) {
  const mainApiUrl = `${mainUrl}/api/v1`;
  const crmApiUrl = `${crmUrl}/api/v1`;
  const files = [
    ['apps/backend/.env', 'APP_BASE_URL', mainUrl],
    ['apps/zalo-mini-app/.env', 'VITE_API_BASE_URL', mainApiUrl],
    ['apps/cms/.env', 'VITE_API_BASE_URL', mainApiUrl],
    ['apps/zalo-crm-frontend/.env', 'VITE_API_BASE_URL', mainApiUrl],
    ['apps/zalo-crm-backend/.env', 'APP_BASE_URL', crmUrl],
    ['apps/zalo-crm-frontend/.env', 'VITE_CRM_API_BASE_URL', crmApiUrl],
  ];

  for (const [relativePath, key, value] of files) {
    updateEnvFile(path.join(rootDir, relativePath), key, value);
    console.log(`[UPDATED] ${relativePath} -> ${key}=${value}`);
  }
}

function updateKeycloakEnvs(keycloakUrl) {
  const files = [
    ['apps/backend/.env', 'KEYCLOAK_URL'],
    ['apps/zalo-crm-backend/.env', 'KEYCLOAK_URL'],
    ['apps/cms/.env', 'VITE_KEYCLOAK_URL'],
    ['apps/zalo-crm-frontend/.env', 'VITE_KEYCLOAK_URL'],
    ['apps/zalo-mini-app/.env', 'VITE_KEYCLOAK_URL'],
  ];
  for (const [relativePath, key] of files) {
    updateEnvFile(path.join(rootDir, relativePath), key, keycloakUrl);
    console.log(`[UPDATED] ${relativePath} -> ${key}=${keycloakUrl}`);
  }
}

function startQuickTunnel(name, port) {
  return new Promise((resolve, reject) => {
    const child = spawn('cloudflared', ['tunnel', '--no-autoupdate', '--url', `http://127.0.0.1:${port}`], {
      cwd: rootDir,
      windowsHide: false,
    });
    processes.push(child);

    let output = '';
    let settled = false;
    const onOutput = (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(`[${name}] ${text}`);
      const match = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
      if (match && !settled) {
        settled = true;
        resolve(match[0]);
      }
    };

    child.stdout.on('data', onOutput);
    child.stderr.on('data', onOutput);
    child.once('error', (error) => {
      if (!settled) reject(new Error(`Không thể chạy cloudflared cho ${name}: ${error.message}`));
    });
    child.once('exit', (code) => {
      if (!settled) reject(new Error(`Quick Tunnel ${name} dừng sớm với mã ${code}.`));
    });
  });
}

function stopAll() {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
}

async function main() {
  process.once('SIGINT', () => { stopAll(); process.exit(130); });
  process.once('SIGTERM', () => { stopAll(); process.exit(143); });

  try {
    const [mainUrl, crmUrl, keycloakUrl] = await Promise.all([
      startQuickTunnel('API', 3000),
      startQuickTunnel('CRM', 3002),
      startQuickTunnel('KEYCLOAK', 8080),
    ]);
    console.log(`\n[TUNNEL] Main API: ${mainUrl}`);
    console.log(`[TUNNEL] CRM API:  ${crmUrl}`);
    console.log(`[TUNNEL] Keycloak:  ${keycloakUrl}`);
    updateProjectEnvs(mainUrl, crmUrl);
    updateKeycloakEnvs(keycloakUrl);
    console.log('\nRestart backend, CRM and frontend processes so they load the new .env values.');
    console.log('\nQuick Tunnels are running. Keep this window open. Press Ctrl+C to stop.');
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    stopAll();
    process.exitCode = 1;
  }
}

main();
