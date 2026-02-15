
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log('Tables:');
        res.rows.forEach(r => console.log(`- ${r.table_name}`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
