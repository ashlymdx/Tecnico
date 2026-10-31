import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATA_BASE,
});


// Exportamos una función 'query' para usar en toda la app
export const query = (text, params) => pool.query(text, params);