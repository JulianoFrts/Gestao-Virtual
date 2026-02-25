import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const ARTIFACTS = path.join(ROOT, "artifacts");

function readArtifact(agentId) {
  const filePath = path.join(ARTIFACTS, agentId, "output.json");
  if (!fs.existsSync(filePath)) return null;

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function calculateGlobalRisk(results) {
  let risk = "Baixo";

  const auditor = results["agent_004"];
  const strategist = results["agent_005"];

  if (auditor?.findings?.riskLevel === "Alto") {
    risk = "Alto";
  }

  if (strategist?.strategy?.riskLevel === "Médio") {
    risk = "Médio";
  }

  return risk;
}

export async function run(context = {}) {
  const timestamp = new Date().toISOString();
  const instruction = context.instruction || "";

  const agents = [
    "agent_001",
    "agent_002",
    "agent_003",
    "agent_004",
    "agent_005",
  ];

  const results = {};

  for (const id of agents) {
    results[id] = readArtifact(id);
  }

  const missingAgents = agents.filter((a) => !results[a]);

  const globalRisk = calculateGlobalRisk(results);

  const productionReady = missingAgents.length === 0 && globalRisk === "Baixo";

  const outputs = [
    "Idioma: pt-BR",
    `Agentes analisados: ${agents.length - missingAgents.length}/${agents.length}`,
    `Risco Global Consolidado: ${globalRisk}`,
    productionReady
      ? "🚀 Sistema considerado pronto para produção"
      : "⚠️ Sistema requer ajustes antes da produção",
  ];

  if (missingAgents.length > 0) {
    outputs.push(`❌ Artifacts ausentes: ${missingAgents.join(", ")}`);
  }

  return {
    status: productionReady ? "OK" : "ATTENTION",
    agent: "006_EXECUTOR",
    timestamp,
    instruction,
    outputs,
    summary: {
      productionReady,
      globalRisk,
      missingAgents,
    },
  };
}
