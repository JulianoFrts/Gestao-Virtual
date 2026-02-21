import path from 'path';
import { fileURLToPath } from 'url';
import { scanner } from '../utils/scanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

export async function run() {
  const timestamp = new Date().toISOString();
  
  // Escaneando Frontend
  const frontendPages = scanner.listFiles(path.join(ROOT, 'frontend', 'src', 'pages'))
    .filter(f => f.endsWith('.tsx'));
    
  // Escaneando Backend
  const backendRoutes = scanner.listFiles(path.join(ROOT, 'backend', 'src', 'app', 'api'))
    .filter(f => f.endsWith('route.ts'));

  const outputs = [
    'Regra de idioma: pt-BR',
    `Frontend: ${frontendPages.length} páginas detectadas`,
    `Backend: ${backendRoutes.length} rotas API detectadas`,
    'Arquitetura mapeada: Next.js + React'
  ];

  return { 
    status: 'OK', 
    agent: '001_ANALYST', 
    timestamp, 
    outputs,
    data: {
      frontendPages: frontendPages.map(p => path.basename(p)),
      backendRoutesCount: backendRoutes.length
    }
  };
}
