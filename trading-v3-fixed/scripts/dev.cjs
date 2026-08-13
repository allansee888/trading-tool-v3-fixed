const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 18) {
  console.error(
    `Node.js ${process.versions.node} is not supported. This project requires Node.js 18 or later.`,
  );
  console.error('Windows: install from https://nodejs.org/ or use nvm-windows: nvm install 18 && nvm use 18');
  process.exit(1);
}

const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
if (!fs.existsSync(tsxCli)) {
  console.error('Dependencies are not installed.');
  console.error(`Run "npm install" in ${root} before "npm run dev".`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsxCli, 'server.ts'], {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
  shell: false,
});

process.exit(result.status ?? 1);
