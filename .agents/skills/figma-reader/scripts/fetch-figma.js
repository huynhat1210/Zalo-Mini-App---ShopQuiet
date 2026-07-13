const fs = require('fs');
const path = require('path');
const https = require('https');

// Read config or environment
const FIGMA_TOKEN = process.env.FIGMA_TOKEN || '';

function extractFileKey(urlOrKey) {
  if (!urlOrKey) return null;
  // If it's a URL like https://www.figma.com/design/FILE_KEY/name or /file/FILE_KEY
  const designRegex = /\/design\/([a-zA-Z0-9]+)/;
  const fileRegex = /\/file\/([a-zA-Z0-9]+)/;
  
  let match = urlOrKey.match(designRegex);
  if (match) return match[1];
  
  match = urlOrKey.match(fileRegex);
  if (match) return match[1];
  
  return urlOrKey; // Assume it's already the key
}

function fetchFigmaFile(fileKey) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.figma.com',
      path: `/v1/files/${fileKey}`,
      method: 'GET',
      headers: {
        'X-Figma-Token': FIGMA_TOKEN
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Figma API returned status ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });
    req.end();
  });
}

const args = process.argv.slice(2);
const inputUrlOrKey = args[0];

if (!inputUrlOrKey) {
  console.error('Usage: node fetch-figma.js <figma-file-url-or-key>');
  process.exit(1);
}

const fileKey = extractFileKey(inputUrlOrKey);
if (!fileKey) {
  console.error('Invalid Figma URL or Key format');
  process.exit(1);
}

console.log(`Fetching Figma file key: ${fileKey}...`);
fetchFigmaFile(fileKey)
  .then((json) => {
    const outPath = path.join(__dirname, '..', 'figma-design.json');
    fs.writeFileSync(outPath, JSON.stringify(json, null, 2), 'utf-8');
    console.log(`Success! Saved Figma design file JSON to: ${outPath}`);
  })
  .catch((err) => {
    console.error('Error fetching from Figma:', err.message);
    process.exit(1);
  });
