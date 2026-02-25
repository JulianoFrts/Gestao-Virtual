import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AGENTS = [
  { id: "agent_001", file: "./agents/agent_001_analysis.js" },
  { id: "agent_002", file: "./agents/agent_002_architect.js" },
  { id: "agent_003", file: "./agents/agent_003_implementer.js" },
  { id: "agent_004", file: "./agents/agent_004_auditor.js" },
  { id: "agent_005", file: "./agents/agent_005_strategist.js" },
  { id: "agent_006", file: "./agents/agent_006_executor.js" },
];

function ensureArtifacts() {
  const artDir = path.join(__dirname, "artifacts");
  if (!fs.existsSync(artDir)) {
    fs.mkdirSync(artDir, { recursive: true });
  }

  AGENTS.forEach((agent) => {
    const agentDir = path.join(artDir, agent.id);
    if (!fs.existsSync(agentDir)) {
      fs.mkdirSync(agentDir, { recursive: true });
    }
  });
}

function resolveAgentFromCommand(command) {
  if (!command) return null;

  const normalized = command.toLowerCase();

  const match = normalized.match(/agente\s*0?(\d)/);
  if (!match) return null;

  const number = match[1].padStart(3, "0");
  return `agent_${number}`;
}

function resolveFromAgent(command) {
  if (!command) return null;

  const normalized = command.toLowerCase();
  const match = normalized.match(/from\s*0?(\d)/);

  if (!match) return null;

  const number = match[1].padStart(3, "0");
  return `agent_${number}`;
}

async function executeAgent(agent, instruction) {
  console.log(`⚙️  Executando ${agent.id}...`);

  const agentPath = path.resolve(__dirname, agent.file);

  if (!fs.existsSync(agentPath)) {
    console.warn(`Arquivo não encontrado: ${agentPath}`);
    return;
  }

  try {
    const agentUrl = pathToFileURL(agentPath).href;
    const mod = await import(agentUrl);

    if (typeof mod.run !== "function") {
      throw new Error(`${agent.id} não exporta run()`);
    }

    const result = await mod.run({
      instruction,
      agentId: agent.id,
    });

    const outputPath = path.join(
      __dirname,
      "artifacts",
      agent.id,
      "output.json",
    );

    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

    console.log(`✅ ${agent.id} finalizado: ${result.status}`);

    return result;
  } catch (err) {
    console.error(`❌ Erro em ${agent.id}:`, err.message);

    fs.writeFileSync(
      path.join(__dirname, "artifacts", agent.id, "error.json"),
      JSON.stringify({ error: err.message, stack: err.stack }, null, 2),
    );

    throw err; // interrompe pipeline se falhar
  }
}

async function run() {
  ensureArtifacts();

  const userCommand = process.argv.slice(2).join(" ");
  console.log("🧠 Comando recebido:", userCommand || "(nenhum)");

  const specificAgentId = resolveAgentFromCommand(userCommand);
  const fromAgentId = resolveFromAgent(userCommand);

  if (specificAgentId) {
    const agent = AGENTS.find((a) => a.id === specificAgentId);
    if (!agent) {
      console.log("Agente não encontrado.");
      return;
    }

    await executeAgent(agent, userCommand);
    console.log("🎯 Execução direcionada concluída.");
    return;
  }

  if (fromAgentId) {
    const startIndex = AGENTS.findIndex((a) => a.id === fromAgentId);
    if (startIndex === -1) {
      console.log("Agente inicial não encontrado.");
      return;
    }

    console.log(`🚀 Executando pipeline a partir de ${fromAgentId}...`);

    for (let i = startIndex; i < AGENTS.length; i++) {
      await executeAgent(AGENTS[i], userCommand);
    }

    console.log("🏁 Pipeline parcial finalizado.");
    return;
  }

  console.log("🔁 Executando fluxo completo: 001 → 006");

  for (const agent of AGENTS) {
    await executeAgent(agent, userCommand);
  }

  console.log("🏁 Fluxo completo finalizado.");
}

run().catch((err) => {
  console.error("🔥 Falha crítica no runner:", err.message);
  process.exit(1);
});
