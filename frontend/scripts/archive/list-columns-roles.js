
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        const res = await client.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'user_roles'");
        console.log('Columns in user_roles:');
        res.rows.forEach(r => console.log(`- ${r.column_name} (${r.data_type}, ${r.udt_name})`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
