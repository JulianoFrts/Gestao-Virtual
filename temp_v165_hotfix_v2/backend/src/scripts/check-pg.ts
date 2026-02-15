import pg from "pg";
import path from "path";
import fs from "fs";

// Load env manually
const envPath = path.join(process.cwd(), ".env.local");
const envDefaultPath = path.join(process.cwd(), ".env");
const content = fs.existsSync(envPath)
  ? fs.readFileSync(envPath, "utf8")
  : fs.readFileSync(envDefaultPath, "utf8");

let databaseUrl = "";
content.split("\n").forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : "";
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.slice(1, -1);
    if (match[1] === "DATABASE_URL") databaseUrl = value;
  }
});

console.log("Connecting to:", databaseUrl);

const pool = new pg.Pool({ connectionString: databaseUrl });

async function check() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("Connection successful:", res.rows[0]);
  } catch (err) {
    console.error("Connection failed:", err);
  } finally {
    await pool.end();
  }
}

check();
