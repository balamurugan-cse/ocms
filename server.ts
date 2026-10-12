import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './server/routes.js';
import { db } from './server/db.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Initialize persistent database
db.read();

// Security and middleware
app.use(
  cors({
    origin: true,
    credentials: true
  })
);
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(cookieParser());

// Mount API versioned under /api/v1
app.use('/api/v1', apiRouter);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'DMI OCMS Backend',
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DMI OCMS] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DMI OCMS] Failed to start server:', err);
  process.exit(1);
});
