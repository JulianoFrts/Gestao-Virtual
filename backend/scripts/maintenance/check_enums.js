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
  console.log("Introspecting enums...");
  try {
    const roles = await pool.query(
      "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'Role'",
    );
    console.log(
      "Role Enum Labels:",
      roles.rows.map((r) => r.enumlabel),
    );

    const appRoles = await pool.query(
      "SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'AppRole'",
    );
    console.log(
      "AppRole Enum Labels:",
      appRoles.rows.map((r) => r.enumlabel),
    );
  } catch (e) {
    console.error("❌ Introspection failed:", e.message);
  } finally {
    await pool.end();
  }
}

main();
