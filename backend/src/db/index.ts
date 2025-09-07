
import { Pool } from 'pg';

const dbConfig = {
  user: process.env.POSTGRES_USER || 'user',
  host: process.env.POSTGRES_HOST || 'db',
  database: process.env.POSTGRES_DB || 'review_management',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: 5432,
};

export const pool = new Pool(dbConfig);

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

export async function connectDb(retries = MAX_RETRIES) {
  try {
    await pool.connect();
    console.log('Connected to PostgreSQL database');
  } catch (err) {
    console.error('Database connection error', err);
    if (retries > 0) {
      console.log(`Retrying connection in ${RETRY_DELAY / 1000} seconds... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, RETRY_DELAY));
      await connectDb(retries - 1);
    } else {
      console.error('Could not connect to the database. Exiting.');
      process.exit(1); // Exit if DB connection fails after all retries
    }
  }
}
