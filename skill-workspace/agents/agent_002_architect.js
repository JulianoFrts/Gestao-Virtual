import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function detectIntent(instruction = "") {
  const text = instruction.toLowerCase();

  return {
    wantsDDD: text.includes("ddd"),
    wantsSolid: text.includes("solid"),
    wantsRefactor: text.includes("refator"),
    wantsOrganization: text.includes("organiza"),
  };
}

function analyzeResponsibilities(content) {
  const hasApiCall = content.includes("fetch(") || content.includes("axios");
  const hasStateLogic =
    content.includes("useState") || content.includes("signals");
  const hasBusinessLogic =
    content.includes("if (") || content.includes("switch (");

  let responsibilityScore = 0;
  if (hasApiCall) responsibilityScore++;
  if (hasStateLogic) responsibilityScore++;
  if (hasBusinessLogic) responsibilityScore++;

  return {
    hasApiCall,
    hasStateLogic,
    hasBusinessLogic,
    responsibilityScore,
  };
}

export async function run(context = {}) {
  const timestamp = new Date().toISOString();
  const instruction = context.instruction || "";
  const intent = detectIntent(instruction);

  const rdoHistoryPath = path.join(
    ROOT,
    "frontend",
    "src",
    "pages",
    "RDOHistory.tsx",
  );

  let historyVerified = false;
  let architectureInsights = [];

  if (fs.existsSync(rdoHistoryPath)) {
    historyVerified = true;

    const content = fs.readFileSync(rdoHistoryPath, "utf8");

    const usesSignals = content.includes("@preact/signals-react");
    const usesAuth = content.includes("useAuth");

    const responsibility = analyzeResponsibilities(content);

    architectureInsights.push(`Signals: ${usesSignals ? "✅" : "❌"}`);

    architectureInsights.push(`Auth Context: ${usesAuth ? "✅" : "❌"}`);

    if (responsibility.responsibilityScore >= 3) {
      architectureInsights.push(
        "⚠️ Possível violação de SRP: UI + Estado + Regra de Negócio na mesma camada",
      );
    } else {
      architectureInsights.push(
        "✅ Separação de responsabilidades aparentemente saudável",
      );
    }

    if (intent.wantsDDD) {
      architectureInsights.push(
        "🏛 Sugestão DDD: Extrair regras para /domain e criar camada application",
      );
    }

    if (intent.wantsSolid) {
      architectureInsights.push(
        "📐 Aplicar DIP: mover chamadas externas para services",
      );
    }

    if (intent.wantsRefactor) {
      architectureInsights.push(
        "♻️ Refatoração sugerida: dividir RDOHistory em Container + View",
      );
    }
  } else {
    architectureInsights.push("❌ RDOHistory.tsx não encontrado");
  }

  const outputs = [
    "Idioma: pt-BR",
    "Análise Arquitetural RDO:",
    ...architectureInsights,
  ];

  return {
    status: "OK",
    agent: "002_ARCHITECT",
    timestamp,
    instruction,
    outputs,
    data: {
      historyVerified,
      intent,
      maturityLevel: historyVerified ? "Intermediário" : "Indefinido",
    },
  };
}
