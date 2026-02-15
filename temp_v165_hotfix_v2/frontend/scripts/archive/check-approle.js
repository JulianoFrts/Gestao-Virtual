
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        const res = await client.query("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'AppRole'");
        console.log('Enum values for AppRole:');
        res.rows.forEach(r => console.log(`- ${r.enumlabel}`));
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
