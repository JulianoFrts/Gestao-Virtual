import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Pool } = require("pg");
import fs from "fs";
import path from "path";

function getDatabaseUrl() {
  try {
    const envPath = path.resolve(".env");
    const content = fs.readFileSync(envPath, "utf8");
    const match = content.match(/^DATABASE_URL=(.*)$/m);
    return match ? match[1].replace(/['"]/g, "").trim() : null;
  } catch (e) {
    return null;
  }
}

const connectionString = getDatabaseUrl();
const pool = new Pool({ connectionString });

async function main() {
  console.log("Checking permission_levels table...");
  try {
    const res = await pool.query("SELECT * FROM permission_levels");
    console.table(res.rows);

    // If we find 'Admin' instead of 'ADMIN', we should update it
    const hasLegacyAdmin = res.rows.some((r) => r.name === "Admin");
    const hasLegacyWorker = res.rows.some((r) => r.name === "worker");

    if (hasLegacyAdmin) {
      console.log("Updating Admin -> ADMIN in permission_levels");
      await pool.query(
        "UPDATE permission_levels SET name = 'ADMIN' WHERE name = 'Admin'",
      );
    }
    if (hasLegacyWorker) {
      console.log("Updating worker -> WORKER in permission_levels");
      await pool.query(
        "UPDATE permission_levels SET name = 'WORKER' WHERE name = 'worker'",
      );
    }
  } catch (e) {
    console.error("❌ Failed:", e.message);
  } finally {
    await pool.end();
  }
}

main();
