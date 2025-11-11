import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import eventsRouter from './routes/events.js';
import { ensureStorageReady } from './services/storageService.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 4000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : undefined,
  }),
);
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', eventsRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ message: err.message ?? 'Internal server error' });
});

const start = async () => {
  await ensureStorageReady();
  app.listen(port, () => {
    console.log(Backend API listening on http://localhost:);
  });
};

start().catch((error) => {
  console.error('Failed to bootstrap backend API', error);
  process.exit(1);
});

export default app;
