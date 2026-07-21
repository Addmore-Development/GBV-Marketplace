const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const file = process.argv[2];
if (!file) {
  console.error('Usage: node run-migration.js <path-to-sql-file>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD ?? ''),
});

(async () => {
  try {
    console.log(`Connecting to ${process.env.DB_NAME} at ${process.env.DB_HOST}:${process.env.DB_PORT || 5432} ...`);
    await pool.query(sql);
    console.log(`Migration applied: ${file}`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
