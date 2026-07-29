import pg from "pg";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// إرجاع أعمدة DATE كنص كما هي بدون تحويل توقيت
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);
