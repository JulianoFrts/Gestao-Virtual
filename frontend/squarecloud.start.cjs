const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 1. Instalação e Build Automático (se necessário)
const distDir = path.join(__dirname, 'dist');
const sentinel = path.join(__dirname, '.square_build_done');

if (!fs.existsSync(sentinel) || process.env.FORCE_REBUILD === 'true') {
  console.log('🏗️ Iniciando build do Frontend na SquareCloud...');
  try {
    // 1. Tentar instalar dependências
    console.log('📦 Sincronizando dependências (npm install --include=dev)...');
    execSync('npm install --include=dev --legacy-peer-deps', { stdio: 'inherit' });

    console.log('⚡ Executando build otimizado via npx (Proxy Relativo Ativo)...');
    // Forçamos VITE_API_URL para /api/v1 no build para que o proxy do Express funcione SEMPRE
    execSync('npx vite build', {
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_API_URL: 'https://api.gestaovirtual.com/api/v1',
        NODE_OPTIONS: '--max-old-space-size=896'
      }
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

// 🔥 PROXY REVERSO (Resolve Erro 404 de API em Builds Estáticos)
let createProxyMiddleware;
try {
  createProxyMiddleware = require('http-proxy-middleware').createProxyMiddleware;
} catch (e) {
  console.warn('⚠️ http-proxy-middleware não encontrado. Tentando instalar com força...');
  execSync('npm install http-proxy-middleware --no-save --legacy-peer-deps', { stdio: 'inherit' });
  createProxyMiddleware = require('http-proxy-middleware').createProxyMiddleware;
}

// 🔥 PROXY REVERSO (v97 - Absolute URL Fix)
// Mantemos a URL completa para evitar que o Express remova o prefixo /api/v1
let targetApi = process.env.VITE_API_URL || 'https://api.gestaovirtual.com/api/v1';

if (!targetApi.startsWith('http')) {
  targetApi = 'https://api.gestaovirtual.com/api/v1';
}

console.log(`🔧 Proxy Ativo: /api/v1 -> ${targetApi}`);

app.use('/api/v1', createProxyMiddleware({
  target: targetApi, // Usar a URL completa (com /api/v1)
  changeOrigin: true,
  pathRewrite: {
    '^/api/v1': '', // Remove o prefixo da requisição pois o target já possui
  },
  onProxyReq: (proxyReq, req, res) => {
    // Garantir que headers de auth passem
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy Error:', err.message);
    res.status(502).send('Erro na comunicação com a API Backend.');
  }
}));

// 🔥 Cópia para rotas genéricas /api
app.use('/api', createProxyMiddleware({
  target: targetApi.split('/api')[0],
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    if (req.headers.authorization) {
      proxyReq.setHeader('Authorization', req.headers.authorization);
    }
  }
}));

// 🔥 CORS & SECURITY ARMOR (v95)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = ['https://gestaovirtual.com', 'https://www.gestaovirtual.com'];

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, cf-ray');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

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
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Suporte a SPA: Qualquer rota que não seja arquivo, manda para o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend Gestão Virtual rodando na porta ${PORT}`);
  console.log(`📡 Proxy API Ativo: ${targetApi}`);
});
