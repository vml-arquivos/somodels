import "dotenv/config";
import { createPool } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations");
}

const pool = createPool(connectionString);
try {
  const db = drizzle(pool);
  await migrate(db, { migrationsFolder: "/app/drizzle" });
  console.log("[Migrations] applied successfully");
} finally {
  await pool.end();
}
