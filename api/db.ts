import { Pool } from 'pg';

export function getDbPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1, // 限制连接数
  });
}

