import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  console.log('--- Invocando Seed via Runner (Relativo) ---');
  // Use relative paths to avoid absolute path space issues
  const seedPath = './prisma/seed.ts';
  const tsxPath = './node_modules/.bin/tsx';
  
  const cmd = `"${tsxPath}" "${seedPath}"`;
  console.log('Executando:', cmd);
  
  execSync(cmd, { stdio: 'inherit' });
  console.log('✅ Seed executado com sucesso pelo runner!');
} catch (error) {
  console.error('❌ Erro no Runner:', error.message);
  process.exit(1);
}
