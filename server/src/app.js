import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import auth from './routes/auth.js';
import projects from './routes/projects.js';
import work from './routes/work.js';
import admin from './routes/admin.js';
import notifications from './routes/notifications.js';

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',') }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'campusflow-api' }));
  app.use('/api/auth', auth);
  app.use('/api/projects', projects);
  app.use('/api/work', work);
  app.use('/api/admin', admin);
  app.use('/api/notifications', notifications);
  app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || (err.code?.startsWith('LIMIT_') ? 400 : 500);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });
  return app;
}
