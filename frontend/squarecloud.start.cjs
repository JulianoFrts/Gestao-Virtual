const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Instalação e Build Automático (se necessário)
const distDir = path.join(__dirname, 'dist');
const sentinel = path.join(__dirname, '.square_build_done');

if (!fs.existsSync(sentinel)) {
  console.log('🏗️ Iniciando build do Frontend na SquareCloud...');
  try {
    // 1. Tentar instalar dependências com força total
    console.log('📦 Sincronizando dependências (npm install --include=dev)...');
    execSync('npm install --include=dev --legacy-peer-deps', { stdio: 'inherit' });

    console.log('⚡ Executando build otimizado via npx...');
    // Aumentamos para 896MB (limite de segurança para containers de 1GB)
    execSync('npx vite build', {
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=896' }
    });

    fs.writeFileSync(sentinel, 'done');
    console.log('✅ Build concluído com sucesso!');
  } catch (err) {
    console.error('❌ Erro no build:', err.message);

    // Fallback: Tentativa de recuperação forçando dependências críticas
    console.log('🔍 Tentativa de recuperação: Reinstalando motores de CSS e Build...');
    try {
      execSync('npm install vite @vitejs/plugin-react @tailwindcss/vite postcss autoprefixer --legacy-peer-deps', { stdio: 'inherit' });
      execSync('npx vite build', {
        stdio: 'inherit',
        env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=896' }
      });
      fs.writeFileSync(sentinel, 'done');
    } catch (retryErr) {
      console.error('💀 Falha crítica na recuperação do build.');
      process.exit(1);
    }
  }
}

// 2. Servidor Express para Produção
const express = require('express');
const app = express();
const PORT = process.env.PORT || 80;

// 🔥 DOMAIN SHIELD v91 (Cloudflare Armor - ULTIMATE LOCKDOWN)
app.use((req, res, next) => {
  const host = (req.headers.host || "").toLowerCase();
  const cfRay = req.headers['cf-ray'];
  const isInternal = host.includes("squareweb.app");

  // Rota limpa
  const rawPath = req.path;
  const isExactRoot = rawPath === "/" || rawPath === "";
  const isStaticFile = rawPath.includes(".") || rawPath.startsWith("/assets/") || rawPath.startsWith("/public/");

  // Se estiver no domínio interno e tentar acessar QUALQUER rota funcional (auth, dashboard, etc)
  if (isInternal && !isExactRoot && !isStaticFile) {
    console.warn(`[SECURITY/v91] ULTIMATE LOCKDOWN: Negando acesso a ${rawPath} via host interno ${host}`);

    // Forçamos o navegador a não cachear esse erro
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <title>Security Alert | Orion</title>
          <style>
              body { background: #020617; color: white; font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .box { max-width: 400px; text-align: center; border: 1px solid #1e293b; padding: 40px; border-radius: 24px; background: #0f172a; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
              .alert { color: #f43f5e; font-weight: 900; font-size: 12px; letter-spacing: 2px; margin-bottom: 20px; }
              h1 { font-size: 20px; margin-bottom: 16px; font-weight: 700; color: #f8fafc; }
              p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin-bottom: 30px; }
              .url { font-family: monospace; background: #1e293b; padding: 12px; border-radius: 12px; color: #38bdf8; font-size: 13px; text-decoration: none; display: block; }
          </style>
      </head>
      <body>
          <div class="box">
              <div class="alert">SECURITY ENFORCED</div>
              <h1>Domínio Não Autorizado</h1>
              <p>Esta rota administrativa foi bloqueada no domínio de hospedagem por motivos de segurança.</p>
              <a href="https://gestaovirtual.com" class="url">acessar via gestaovirtual.com</a>
          </div>
      </body>
      </html>
    `);
  }

  next();
});


// 🔥 CORS & SECURITY ARMOR (v95)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://gestaovirtual.com', 'https://www.gestaovirtual.com'];

  // CORS: Apenas domínios oficiais
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  // Cabeçalhos de Segurança Essenciais
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, cf-ray');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY'); // Previne Clickjacking
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Bloqueio de Cache para dados sensíveis se necessário
  if (req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve arquivos estáticos da pasta dist
app.use(express.static(distDir, {
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Suporte a SPA: Qualquer rota que não seja arquivo, manda para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend Gestão Virtual rodando na porta ${PORT}`);
  console.log(`📡 API Backend: ${process.env.VITE_API_URL || 'Padrão'}`);
});
