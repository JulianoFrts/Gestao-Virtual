const pg = require("pg");
const { Client } = pg;

// Use connection string from env if possible, or common defaults
const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/orion_db";

async function main() {
  const client = new Client({ connectionString });
  try {
    await client.connect();

    console.log("\n--- TOWER DATA RAW CHECK ---");
    const res = await client.query(
      "SELECT object_id, go_forward, distance, is_hidden FROM tower_technical_data ORDER BY object_seq LIMIT 10",
    );

    console.table(res.rows);

    const counts = await client.query(
      "SELECT COUNT(*) as total, SUM(CASE WHEN is_hidden THEN 1 ELSE 0 END) as hidden_count FROM tower_technical_data",
    );
    console.log("\nCounts:", counts.rows[0]);
  } catch (err) {
    console.error("DB Error:", err.message);
  } finally {
    await client.end();
  }
}

main();
