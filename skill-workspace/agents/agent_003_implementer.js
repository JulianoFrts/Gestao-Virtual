import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function detectIntent(instruction = "") {
  const text = instruction.toLowerCase();

  return {
    wantsRefactor: text.includes("refator"),
    wantsCleanup: text.includes("limpeza"),
    wantsSolid: text.includes("solid"),
    wantsDDD: text.includes("ddd"),
  };
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

export async function run(context = {}) {
  const timestamp = new Date().toISOString();
  const instruction = context.instruction || "";
  const intent = detectIntent(instruction);

  const rdoHistoryPath = "frontend/src/pages/RDOHistory.tsx";
  const globalInitializerPath = "frontend/src/components/GlobalInitializer.tsx";
  const configPath = "frontend/src/routes/config.tsx";

  const rdoExists = fileExists(rdoHistoryPath);
  const globalInitializerExists = fileExists(globalInitializerPath);
  const configExists = fileExists(configPath);

  let routeRegistered = false;

  if (configExists) {
    const content = fs.readFileSync(path.join(ROOT, configPath), "utf8");
    routeRegistered = content.includes("/rdo/history");
  }

  const outputs = [
    "Idioma: pt-BR",
    rdoExists
      ? "✅ Página RDOHistory.tsx localizada"
      : "❌ Página RDOHistory.tsx não encontrada",

    globalInitializerExists
      ? "✅ GlobalInitializer.tsx localizado"
      : "❌ GlobalInitializer.tsx não encontrado",

    routeRegistered
      ? "✅ Rota /rdo/history registrada no config"
      : "❌ Rota /rdo/history não encontrada no config",
  ];

  if (intent.wantsRefactor) {
    outputs.push(
      "♻️ Refatoração solicitada: sugerido dividir lógica em hooks + services",
    );
  }

  if (intent.wantsCleanup) {
    outputs.push(
      "🧹 Limpeza estrutural sugerida: remover imports não utilizados e separar responsabilidades",
    );
  }

  if (intent.wantsSolid) {
    outputs.push("📐 Aplicar SRP: separar lógica de dados da camada de UI");
  }

  if (intent.wantsDDD) {
    outputs.push(
      "🏛 Aplicar DDD: mover regras de negócio para /domain e criar camada application",
    );
  }

  return {
    status: "OK",
    agent: "003_IMPLEMENTER",
    timestamp,
    instruction,
    outputs,
    data: {
      rdoExists,
      globalInitializerExists,
      routeRegistered,
      intent,
    },
  };
}
