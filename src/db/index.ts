import * as dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolConfig } from "pg";
import * as schema from "./schema.ts";

dotenv.config();

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    const databaseUrl = process.env["DATABASE_URL"];
    const config: PoolConfig = {
      max: 10,
      connectionTimeoutMillis: 15000,
    };

    if (databaseUrl) {
      // Supabase and other hosted PostgreSQL providers commonly require TLS.
      config.connectionString = databaseUrl;
      config.ssl = { rejectUnauthorized: false };
    } else {
      const host = process.env["SQL_HOST"];
      const user = process.env["SQL_USER"];
      const password = process.env["SQL_PASSWORD"];
      const database = process.env["SQL_DB_NAME"];

      if (!host || !user || !password || !database) {
        throw new Error(
          "Database configuration is missing. Set DATABASE_URL or all of SQL_HOST, SQL_USER, SQL_PASSWORD, and SQL_DB_NAME.",
        );
      }

      config.host = host;
      config.user = user;
      config.password = password;
      config.database = database;

      if (process.env["SQL_PORT"]) {
        config.port = Number(process.env["SQL_PORT"]);
      }
      if (process.env["SQL_SSL"] === "true") {
        config.ssl = { rejectUnauthorized: false };
      }
    }

    global._postgresPool = new Pool(config);
    global._postgresPool.on("error", (err) => {
      console.error("Unexpected error on idle SQL pool client:", err);
    });
  }
  return global._postgresPool;
};

const pool = createPool();
export const db = drizzle(pool, { schema });
