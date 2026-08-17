require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const cron = require('node-cron');
const connectDB = require('./db/database');
const Task = require('./models/Task');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── CORS Configuration for Vercel + Localhost + Render ───────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  process.env.CLIENT_URL,
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        origin.endsWith('.onrender.com') ||
        origin.includes('localhost')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ─── Middleware ──────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json());

// ─── Serve static frontend ─────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Health Check Endpoint ───────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    status: 'online',
    service: 'HappieLoop API',
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ─────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// ─── Automatic 12:00 Midnight Cron Job ──────────────────────────────
// Runs every day at 00:00:00 (12:00 AM Midnight) to clear completed tasks
cron.schedule('0 0 * * *', async () => {
  try {
    console.log('⏰ [12:00 Midnight Cron] Running automatic purge of completed tasks...');
    const result = await Task.deleteMany({ completed: true });
    console.log(`🧹 [Midnight Cleanup] Purged ${result.deletedCount} completed tasks at midnight.`);
  } catch (err) {
    console.error('❌ [Midnight Cleanup Error]:', err.message);
  }
});

// ─── Fallback to index.html for SPA ─────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Global error handler ───────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start server after DB connection ───────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`⏱️ Daily 12:00 AM midnight cleanup schedule active`);
  });
});
