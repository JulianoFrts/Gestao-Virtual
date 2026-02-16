
const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const connectionString = process.env.DATABASE_URL;

async function testSupabase() {
    console.log('Testing Supabase Connection...');
    console.log('URL:', connectionString.replace(/:.*@/, ':****@')); // Oculta senha no log

    if (connectionString.includes('[SUA_SENHA_AQUI]')) {
        console.error('❌ ERRO: Você precisa substituir [SUA_SENHA_AQUI] pela sua senha real no arquivo backend/.env');
        return;
    }

    const pool = new Pool({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000
    });

    try {
        const client = await pool.connect();
        console.log('✅ SUCESSO! Conectado ao Supabase.');
        const res = await client.query('SELECT version(), current_database(), current_user');
        console.log('Resultados:', res.rows[0]);
        client.release();
    } catch (err) {
        console.error('❌ Falha na conexão com Supabase:', err.message);
        if (err.message.includes('password authentication failed')) {
            console.error('👉 Dica: Verifique se a senha no .env está correta.');
        }
    } finally {
        await pool.end();
    }
}

testSupabase();
