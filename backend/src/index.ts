import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import centreRoutes from './routes/centre.routes';
import sellerRoutes from './routes/seller.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use('/api/centres', centreRoutes);
app.use('/api/sellers', sellerRoutes);

// PostgreSQL connection
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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