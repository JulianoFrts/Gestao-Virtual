
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, 'backend');
const envFile = path.join(backendDir, '.env');

// Ler o .env manualmente para garantir que as variáveis estão corretas
const envConfig = {};
if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    envContent.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] ? match[2].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            envConfig[match[1]] = value;
        }
    });
}

const env = {
    ...process.env,
    ...envConfig,
    NODE_ENV: 'development',
    PORT: '3000'
};

console.log('🚀 Iniciando Backend (Next.js) direto via node script...');

const nextBin = path.join('c:\\Users\\Juliano Freitas\\Documents\\GitHub\\Gestao-Virtual\\backend', 'node_modules', '.bin', 'next.cmd');
const child = spawn(nextBin, ['dev', '-p', '3000'], {
    cwd: backendDir,
    env: env,
    shell: true,
    stdio: 'inherit'
});

child.on('error', (err) => {
    console.error('❌ Falha ao iniciar processo:', err);
});

child.on('exit', (code) => {
    console.log(`📡 Processo finalizado com código ${code}`);
});
