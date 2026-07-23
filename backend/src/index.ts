import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import centreRoutes from './routes/centre.routes';
import marketplaceRoutes from './routes/marketplace.routes';
import sellerRoutes from './routes/seller.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());

// Routes
app.use('/api/centres', centreRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/sellers', sellerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/uploads', express.static('uploads'));


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

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});