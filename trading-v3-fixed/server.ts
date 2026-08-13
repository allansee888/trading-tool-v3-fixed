import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import * as admin from 'firebase-admin';
import { setupAlpacaRoutes, setupAlpacaRoutesV2 } from './functions/src/alpaca';
import { startAlpacaStream } from './functions/src/alpacaStream';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';

let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf-8'));
} catch (e) {
  console.error('Could not load firebase-applet-config.json', e);
}

admin.initializeApp({
  projectId: firebaseConfig.projectId || process.env.FIREBASE_PROJECT_ID || 'demo-project',
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  setupAlpacaRoutes(app);
  setupAlpacaRoutesV2(app);
  startAlpacaStream();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
