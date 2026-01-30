import { Pool } from '@neondatabase/serverless';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function query(sqlQuery, params = []) {
  try {
    const result = await pool.query(sqlQuery, params);
    return result.rows;
  } catch (error) {
    console.error('Database error:', error.message);
    throw error;
  }
}

export async function queryOne(sqlQuery, params = []) {
  const result = await query(sqlQuery, params);
  return result[0] || null;
}
