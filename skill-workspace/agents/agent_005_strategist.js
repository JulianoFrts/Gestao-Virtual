import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function detectIntent(instruction = "") {
  const text = instruction.toLowerCase();
  return {
    wantsScale: text.includes("escala") || text.includes("volum"),
    wantsPerformance: text.includes("performance"),
    wantsRisk: text.includes("risco"),
    wantsOptimization: text.includes("otimiz"),
  };
}

function estimateMaturity(frontendExists, backendExists) {
  if (frontendExists && backendExists) return "Intermediário";
  if (frontendExists && !backendExists) return "Inicial";
  return "Indefinido";
}

export async function run(context = {}) {
  const timestamp = new Date().toISOString();
  const instruction = context.instruction || "";
  const intent = detectIntent(instruction);

  const frontendPath = path.join(ROOT, "frontend");
  const backendPath = path.join(ROOT, "backend");

  const frontendExists = fs.existsSync(frontendPath);
  const backendExists = fs.existsSync(backendPath);

  let riskLevel = "Baixo";
  let scalabilityScore = 7; // base hipotética

  if (!backendExists) {
    riskLevel = "Médio";
    scalabilityScore = 5;
  }

  if (intent.wantsScale) {
    scalabilityScore += 1;
  }

  if (intent.wantsRisk) {
    riskLevel = "Reavaliar com métricas reais";
  }

  const maturity = estimateMaturity(frontendExists, backendExists);

  const outputs = [
    "Idioma: pt-BR",
    `Maturidade Arquitetural: ${maturity}`,
    `Risco Estratégico Atual: ${riskLevel}`,
    `Score de Escalabilidade (0-10): ${scalabilityScore}`,
    "Cache: Uso de localStorage adequado para rascunhos locais",
  ];

  if (intent.wantsScale) {
    outputs.push(
      "📈 Sugestão: implementar paginação server-side e indexação no backend.",
    );
  }

  if (intent.wantsPerformance) {
    outputs.push("⚡ Sugestão: avaliar memoização e lazy loading.");
  }

  if (intent.wantsOptimization) {
    outputs.push("🔧 Recomendado: mover lógica pesada para backend.");
  }

  return {
    status: "OK",
    agent: "005_STRATEGIST",
    timestamp,
    instruction,
    outputs,
    strategy: {
      maturity,
      riskLevel,
      scalabilityScore,
      intent,
    },
  };
}
