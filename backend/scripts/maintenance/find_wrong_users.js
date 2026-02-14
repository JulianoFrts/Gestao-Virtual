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
  console.log('Searching for users named "Usuário" or with WORKER roles...');
  try {
    const res = await pool.query(
      "SELECT id, email, name, role FROM users WHERE name ILIKE '%Usuário%' OR role = 'WORKER'",
    );
    console.log("Users found:");
    console.log(JSON.stringify(res.rows, null, 2));

    const res2 = await pool.query(
      "SELECT u.id, u.email, u.name, ur.role as app_role FROM users u JOIN user_roles ur ON u.id = ur.user_id WHERE ur.role = 'WORKER'",
    );
    console.log("Users with WORKER app_role:");
    console.log(JSON.stringify(res2.rows, null, 2));
  } catch (e) {
    console.error("❌ Failed:", e.message);
  } finally {
    await pool.end();
  }
}

main();
