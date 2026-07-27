import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Pool } from 'pg';
import centreRoutes from './routes/centre.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import sellerRoutes from './routes/seller.routes';
import adminRoutes from './routes/admin.routes';
import { initSocket } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Wrap express in a raw http server so Socket.IO can share the same port —
// this is what powers every real-time feature (SOS banners, live needs
// board, live buyer/seller signups on the admin dashboard).
const httpServer = createServer(app);
initSocket(httpServer);

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/centres', centreRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/uploads', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static('uploads'));


// PostgreSQL connection
// Supabase (or any hosted Postgres) — set DATABASE_URL and this takes over.
// Falls back to the individual DB_* vars for local development.
export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: String(process.env.DB_PASSWORD ?? ''),
    });

// Test DB connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Connected to PostgreSQL');
    release();
  }
});

// Health check route
app.get('/', (req, res) => {
  res.json({ message: '🛒 GBV Marketplace API is running' });
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO real-time layer active`);
});