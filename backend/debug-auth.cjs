
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Load .env manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log('Loading .env from', envPath);
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1].trim();
            const value = match[2].trim().replace(/^["']|["']$/g, '');
            process.env[key] = value;
        }
    });
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL not found in .env');
    process.exit(1);
}

// Certs config
const certsDir = path.join(__dirname, 'certificates');
const ca = fs.existsSync(path.join(certsDir, 'ca-certificate.crt')) ? fs.readFileSync(path.join(certsDir, 'ca-certificate.crt')) : null;
const cert = fs.existsSync(path.join(certsDir, 'certificate.pem')) ? fs.readFileSync(path.join(certsDir, 'certificate.pem')) : null;
const key = fs.existsSync(path.join(certsDir, 'private-key.key')) ? fs.readFileSync(path.join(certsDir, 'private-key.key')) : null;

console.log('Original DB URL:', connectionString.replace(/:[^:/@]+@/, ':****@'));
console.log('Certs found:', { ca: !!ca, cert: !!cert, key: !!key });

async function testConnection(url, sslConfig, label) {
    console.log(`\n--- Testing: ${label} ---`);
    const masked = url.replace(/:[^:/@]+@/, ':****@');
    console.log(`URL: ${masked}`);

    // STRIP QUERY PARAMS to avoid pg-connection-string overriding our ssl object
    const cleanUrl = url.split('?')[0];

    const pool = new Pool({
        connectionString: cleanUrl,
        ssl: sslConfig,
        connectionTimeoutMillis: 5000,
    });

    try {
        const client = await pool.connect();
        console.log('✅ Connected!');
        const res = await client.query('SELECT current_database(), current_user, current_schema()');
        console.log('Results:', res.rows[0]);

        client.release();
        return true;
    } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
        return false;
    } finally {
        await pool.end();
    }
}

async function run() {
    // 1. Current Probe Config (Fail Expected without certs)
    await testConnection(connectionString, { rejectUnauthorized: false }, 'Probe Default (No Certs)');

    // 2. mTLS Config (The Fix)
    if (ca && cert && key) {
        await testConnection(connectionString, {
            ca,
            cert,
            key,
            rejectUnauthorized: false
        }, 'mTLS (Full Certs)');
    }

    // 3. mTLS + gestaodb
    if (ca && cert && key) {
        try {
            const urlObj = new URL(connectionString);
            urlObj.pathname = '/gestaodb';
            await testConnection(urlObj.toString(), {
                ca,
                cert,
                key,
                rejectUnauthorized: false
            }, 'mTLS + gestaodb');
        } catch (e) {
            console.log('Error testing specific DB:', e.message);
        }
    }

    // 4. Try with uselibpqcompat=true
    await testConnection(connectionString + (connectionString.includes('?') ? '&' : '?') + 'uselibpqcompat=true', { rejectUnauthorized: false }, 'uselibpqcompat=true');
}

run();
