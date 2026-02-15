
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        console.log('Connected to database');

        try {
            await client.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_system_admin BOOLEAN DEFAULT FALSE");
            console.log("Added column is_system_admin to users");
        } catch (e) {
            console.log("Notice: " + e.message);
        }

        await client.query("UPDATE users SET is_system_admin = TRUE");
        console.log("Updated all users to is_system_admin = TRUE");

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
