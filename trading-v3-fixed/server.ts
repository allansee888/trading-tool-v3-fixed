import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import { setupAlpacaRoutes, setupAlpacaRoutesV2 } from './functions/src/alpaca';
import { startAlpacaStream } from './functions/src/alpacaStream';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(rootDir, '.env.local') });
dotenv.config({ path: path.join(rootDir, '.env') });

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(
    fs.readFileSync(path.join(rootDir, 'firebase-applet-config.json'), 'utf-8'),
  );
} catch (e) {
  console.error('Could not load firebase-applet-config.json', e);
}

admin.initializeApp({
  projectId: firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || 'demo-project',
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json());

  setupAlpacaRoutes(app);
  setupAlpacaRoutesV2(app);
  startAlpacaStream();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      root: rootDir,
      configFile: path.join(rootDir, 'vite.config.ts'),
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(rootDir, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a free port.`);
    } else {
      console.error('Server failed to listen:', err);
    }
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
