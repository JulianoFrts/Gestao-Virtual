import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const AGENTS = [
  { id: 'agent_001', file: './agents/agent_001_analysis.js' },
  { id: 'agent_002', file: './agents/agent_002_architect.js' },
  { id: 'agent_003', file: './agents/agent_003_implementer.js' },
  { id: 'agent_004', file: './agents/agent_004_auditor.js' },
  { id: 'agent_005', file: './agents/agent_005_strategist.js' },
  { id: 'agent_006', file: './agents/agent_006_executor.js' }
];

function ensureArtifacts() {
  const artDir = path.join(__dirname, 'artifacts');
  if (!fs.existsSync(artDir)) {
    fs.mkdirSync(artDir, { recursive: true });
    console.log('Criada pasta artifacts/');
  }
  
  // Garantir pastas individuais
  AGENTS.forEach(agent => {
    const agentDir = path.join(artDir, agent.id);
    if (!fs.existsSync(agentDir)) fs.mkdirSync(agentDir, { recursive: true });
  });
}

async function run() {
  ensureArtifacts();
  console.log('Fluxo obrigatório: 001 -> 002 -> 003 -> 004 -> 005 -> 006');
  for (const agent of AGENTS) {
    console.log(`Executando ${agent.id}...`);
    const agentPath = path.join(__dirname, agent.file);
    if (!fs.existsSync(agentPath)) {
      console.warn(`Arquivo do agente não encontrado: ${agentPath} (pulando com mock)`);
      const mock = { status: 'SKIPPED_MOCK', timestamp: new Date().toISOString(), outputs: [], questions: [] };
      fs.writeFileSync(path.join(__dirname, 'artifacts', agent.id, 'output.json'), JSON.stringify(mock, null, 2));
      continue;
    }
    try {
        const agentUrl = pathToFileURL(agentPath).href;
        const mod = await import(agentUrl);
        if (typeof mod.run !== 'function') throw new Error(`${agent.id} não exporta run()`);
        const result = await mod.run();
        fs.writeFileSync(path.join(__dirname, 'artifacts', agent.id, 'output.json'), JSON.stringify(result, null, 2));
        console.log(`${agent.id} finalizado: ${result.status}`);
    } catch (err) {
        console.error(`Erro ao executar ${agent.id}:`, err.message);
        fs.writeFileSync(path.join(__dirname, 'artifacts', agent.id, 'error.json'), JSON.stringify({ error: err.message, stack: err.stack }, null, 2));
    }
  }
  console.log('Fluxo finalizado. Cheque a pasta artifacts/ para outputs.');
}

run().catch(err => { console.error(err); process.exit(1); });
