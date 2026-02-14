
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_roles'");
        console.log('Columns in user_roles:');
        res.rows.forEach(r => console.log(`- ${r.column_name}`));

        const users = await client.query("SELECT id, email, role FROM users");
        console.log('Users role in users table:');
        users.rows.forEach(u => console.log(`- ${u.email}: ${u.role}`));
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

run();
