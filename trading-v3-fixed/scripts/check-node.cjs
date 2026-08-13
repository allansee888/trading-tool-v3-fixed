const major = parseInt(process.versions.node.split('.')[0], 10);

if (major < 18) {
  console.error(
    `Node.js ${process.versions.node} is not supported. This project requires Node.js 18 or later.`,
  );
  console.error('Install Node 18+ from https://nodejs.org/ or run: nvm install 18');
  process.exit(1);
}
