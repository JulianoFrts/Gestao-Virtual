
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();

        // Add superadmingod to Role enum
        try {
            await client.query("ALTER TYPE \"Role\" ADD VALUE 'superadmingod'");
        } catch (e) { }

        await client.query("UPDATE users SET role = 'superadmingod' WHERE email = 'julianogitiz@gmail.com'");
        await client.query("UPDATE user_roles SET role = 'superadmingod' WHERE user_id = (SELECT id FROM users WHERE email = 'julianogitiz@gmail.com')");
        console.log("User julianogitiz@gmail.com is now superadmingod");
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
