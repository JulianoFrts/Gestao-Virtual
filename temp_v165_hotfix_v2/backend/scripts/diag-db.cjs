const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function diag() {
  console.log('🔍 [v45] Iniciando Diagnóstico de Conexão Bruta (pg)...');
  
  const connectionString = process.env.DATABASE_URL?.replace(/['"]/g, "");
  if (!connectionString) {
    console.error('❌ ERRO: Nenhuma DATABASE_URL fornecida.');
    return;
  }
  const masked = connectionString.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
  console.log(`🔗 URL: ${masked}`);

  const certPath = path.resolve(__dirname, '..', 'certificates', 'client.crt');
  const keyPath = path.resolve(__dirname, '..', 'certificates', 'client.key');
  const caPath = path.resolve(__dirname, '..', 'certificates', 'ca.crt');

  const sslConfig = {
    rejectUnauthorized: false
  };

  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    sslConfig.cert = fs.readFileSync(certPath);
    sslConfig.key = fs.readFileSync(keyPath);
    if (fs.existsSync(caPath)) {
      sslConfig.ca = fs.readFileSync(caPath);
      console.log('🛡️  Certificado Cliente + CA (Buffers) carregados.');
    } else {
      console.log('🛡️  Certificado e Chave Cliente (Buffers) carregados.');
    }
  }

  async function testConnection(targetUrl, label) {
    console.log(`\n--- [TESTE] ${label} ---`);
    const pool = new Pool({
      connectionString: targetUrl,
      ssl: sslConfig,
      connectionTimeoutMillis: 10000
    });

    try {
      const client = await pool.connect();
      console.log(`✅ CONEXÃO ${label} SUCESSO!`);
      const res = await client.query('SELECT current_database(), current_user');
      console.log('📊 STATUS:', res.rows[0]);
      
      try {
        const dbs = await client.query('SELECT datname FROM pg_database WHERE datistemplate = false');
        console.log('📂 BANCOS DISPONÍVEIS LÁ DENTRO:', dbs.rows.map(r => r.datname));
      } catch(e) { /* ignore restricted list */ }
      
      client.release();
      return true;
    } catch (err) {
      console.error(`❌ ERRO ${label}:`, err.message);
      if (err.code === '28000') {
         console.warn('💡 Dica: Erro 28000 é Acesso Negado (mTLS ou Login).');
      }
      if (err.message.includes('valid client certificate')) {
         console.warn('🚨 ALERTA: O servidor NÃO está recebendo o certificado mTLS.');
      }
      return false;
    } finally {
      await pool.end();
    }
  }

  // 1. Testa a URL original
  const successMain = await testConnection(connectionString, 'BANCO PRINCIPAL');

  // 2. Se falhar, tenta o banco global 'postgres'
  if (!successMain && connectionString.includes('/')) {
    const postgresUrl = connectionString.replace(/\/([^\/?]+)(\?|$)/, '/postgres$2');
    await testConnection(postgresUrl, 'BANCO POSTGRES (Fallback)');
  }

  // 3. Tenta o banco 'squarecloud' (nome comum do usuário padrão)
  if (!successMain && connectionString.includes('/')) {
    const squareUrl = connectionString.replace(/\/([^\/?]+)(\?|$)/, '/squarecloud$2');
    await testConnection(squareUrl, 'BANCO SQUARECLOUD (Fallback)');
  }
}

diag();
