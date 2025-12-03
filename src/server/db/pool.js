import mysql from "mysql2/promise";
import { dbConfig } from "../config/env.js";

const pool = mysql.createPool({
  ...dbConfig,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export function getPool() {
  return pool;
}

export async function query(sql, values = []) {
  const [rows] = await pool.query(sql, values);
  return rows;
}
