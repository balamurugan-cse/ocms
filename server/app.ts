import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import apiRouter from './routes.js';
import { db } from './db.js';

dotenv.config();

const app = express();

// Initialize persistent database
try {
  db.read();
} catch (e) {
  console.error('[DMI OCMS] Database initialization warning:', e);
}

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

// Mount API under all standard prefixes so neither client nor Vercel rewrites ever mismatch
app.use('/api/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/v1', apiRouter);
app.use(apiRouter);

// Health check endpoints
app.get(['/api/health', '/api/v1/health', '/health'], (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'DMI OCMS Backend',
    timestamp: new Date().toISOString()
  });
});

// Global API error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Global Server Error]', err);
  const status =
    typeof err.status === 'number'
      ? err.status
      : typeof err.statusCode === 'number'
      ? err.statusCode
      : 500;
  const message = err.message || 'Internal server error occurred.';
  res.status(status).json({ error: message });
});

export default app;
