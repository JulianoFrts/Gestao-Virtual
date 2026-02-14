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
  console.log("Listing all users for debug...");
  try {
    const res = await pool.query("SELECT id, email, name, role FROM users");
    console.table(res.rows);

    const urRes = await pool.query("SELECT user_id, role FROM user_roles");
    console.log("User Roles (AppRole):");
    console.table(urRes.rows);
  } catch (e) {
    console.error("❌ Failed:", e.message);
  } finally {
    await pool.end();
  }
}

main();
