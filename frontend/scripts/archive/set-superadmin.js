
import pkg from 'pg';
const { Client } = pkg;

async function run() {
    const client = new Client({
        connectionString: "postgresql://orion:OrionPass123@localhost:5432/orion_db",
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Expand Role enum
        try {
            await client.query("ALTER TYPE \"Role\" ADD VALUE 'super_admin'");
            console.log("Added 'super_admin' to Role enum");
        } catch (e) { console.log("Role 'super_admin' might already exist or failed: " + e.message); }

        try {
            await client.query("ALTER TYPE \"Role\" ADD VALUE 'SUPER_ADMIN'");
            console.log("Added 'SUPER_ADMIN' to Role enum");
        } catch (e) { }

        // Expand AppRole enum
        try {
            await client.query("ALTER TYPE \"AppRole\" ADD VALUE 'super_admin'");
            console.log("Added 'super_admin' to AppRole enum");
        } catch (e) { console.log("AppRole 'super_admin' might already exist or failed: " + e.message); }

        try {
            await client.query("ALTER TYPE \"AppRole\" ADD VALUE 'superadmingod'");
            console.log("Added 'superadmingod' to AppRole enum");
        } catch (e) { }

        // Now promote everyone
        const res = await client.query('SELECT id, email FROM users');
        for (const user of res.rows) {
            console.log(`Promoting ${user.email} to super_admin`);
            await client.query("UPDATE users SET role = 'super_admin' WHERE id = $1", [user.id]);

            const roleRes = await client.query('SELECT id FROM user_roles WHERE user_id = $1', [user.id]);
            if (roleRes.rows.length > 0) {
                await client.query("UPDATE user_roles SET role = 'super_admin' WHERE user_id = $1", [user.id]);
            } else {
                // We need a UUID. Using a simple mock one since it's local.
                const newId = 'admin-' + user.id.substring(0, 8);
                await client.query("INSERT INTO user_roles (id, user_id, role) VALUES ($1, $2, 'super_admin')", [newId, user.id]);
            }
        }

        console.log('Promotion complete.');

    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
    } finally {
        await client.end();
    }
}

run();
