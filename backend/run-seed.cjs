const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const sqlFile = path.join(__dirname, 'prisma', 'seed_all_clean.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('Connecting to database...');
  await client.connect();
  console.log('Connected. Executing seed...');
  
  try {
    // Split combined SQL by semicolons (simple split)
    // Note: This won't work for complex SQL with nested semicolons, but for simple seeds it's fine.
    // However, executing the whole string as one query is usually supported by pg.
    await client.query(sql);
    console.log('Seed executed successfully!');
  } catch (err) {
    console.error('Error executing seed:', err);
  } finally {
    await client.end();
  }
}

main();
