
const { Pool } = require('pg');

const connectionString = 'postgresql://neondb_owner:npg_lrvx3EjZVaS6@ep-withered-shadow-acnsxlzl-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function testNeon() {
    console.log('Testing Neon Connection...');
    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false // Often needed for Neon if certs aren't in system store
        },
        connectionTimeoutMillis: 10000
    });

    try {
        const client = await pool.connect();
        console.log('✅ SUCESSO! Conectado ao Neon.');
        const res = await client.query('SELECT version(), current_database(), current_user');
        console.log('Resultados:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('❌ Falha na conexão com Neon:', err.message);
    } finally {
        await pool.end();
    }
}

testNeon();
