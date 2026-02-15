
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users'");
        console.log('Columns in users:');
        res.rows.forEach(r => console.log(`- ${r.column_name}`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
