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

  // Busca específica por componentes RDO
  const rdoHistory = frontendPages.find(p => p.includes('RDOHistory'));
  const notificationLogic = scanner.listFiles(path.join(ROOT, 'frontend', 'src', 'components'))
    .find(f => f.includes('GlobalInitializer'));

  const outputs = [
    'Regra de idioma: pt-BR',
    `Frontend: ${frontendPages.length} páginas detectadas`,
    rdoHistory ? '✅ Página de Histórico RDO encontrada (RDOHistory.tsx)' : '❌ Página de Histórico RDO não encontrada',
    notificationLogic ? '✅ Lógica de Notificação detectada em GlobalInitializer' : '❌ Sistema de notificação não localizado',
    'Status: Pronto para Auditoria Técnica'
  ];

  return { 
    status: 'OK', 
    agent: '001_ANALYST', 
    timestamp, 
    outputs,
    data: {
      rdoHistory: !!rdoHistory,
      notificationLogic: !!notificationLogic,
      frontendPagesCount: frontendPages.length
    }
  };
}
