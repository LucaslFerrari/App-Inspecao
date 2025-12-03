import dotenv from "dotenv";
import path from "path";

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || "development";
export const isProduction = NODE_ENV === "production";
export const ROOT_DIR = process.cwd();
export const DIST_DIR = path.join(ROOT_DIR, "dist");
export const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");
export const STORAGE_DRIVER = process.env.STORAGE_DRIVER || "local";
export const API_PORT = Number(process.env.API_PORT || process.env.PORT || 3500);

export const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
