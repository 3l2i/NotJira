import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import projectRoutes from './routes/projects.js';
import teamRoutes from './routes/teams.js';
import commentRoutes from './routes/comments.js';
import uploadRoutes from './routes/upload.js';
import userRoutes from './routes/users.js';
import { errorHandler } from './utils/errors.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Configurations ─────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  process.env.CLOUDFRONT_URL || 'https://d9lm1us8lvrs3.cloudfront.net', 
];

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests, try again in a minute' },
  standardHeaders: true,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many login attempts, try again in 15 minutes' },
  standardHeaders: true,
});

// ─── Global Middleware ───────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,  // Nginx handles this
  hsts: false,                   // Nginx handles this too
}));

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin} is not allowed`));
      }
    },
    credentials: true,
  })
);
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Apply rate limits
app.use('/api/auth', authLimiter);
app.use('/api', apiLimiter);

// ─── Health Check (no auth — used by ALB) ────────────────
app.get('/api/health', (_req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/users', userRoutes);

// ─── 404 Catch-All ──────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ──────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ───────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Mini-Jira API server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Health check: http://localhost:${PORT}/api/health`);
});

export default app;
