import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { scanner } from "../utils/scanner.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function detectIntent(instruction = "") {
  const text = instruction.toLowerCase();

  return {
    wantsCleanup: text.includes("limpeza") || text.includes("organiza"),
    wantsSolid: text.includes("solid"),
    wantsDDD: text.includes("ddd"),
    wantsAudit: text.includes("auditoria"),
  };
}

function checkLayerSeparation() {
  const frontendPath = path.join(ROOT, "frontend");
  const backendPath = path.join(ROOT, "backend");

  return {
    frontendExists: fs.existsSync(frontendPath),
    backendExists: fs.existsSync(backendPath),
  };
}

export async function run(context = {}) {
  const timestamp = new Date().toISOString();
  const instruction = context.instruction || "";

  const intent = detectIntent(instruction);
  const layers = checkLayerSeparation();

  // Escaneando Frontend
  const frontendPages = scanner
    .listFiles(path.join(ROOT, "frontend", "src", "pages"))
    .filter((f) => f.endsWith(".tsx"));

  // Escaneando Backend
  const backendRoutes = scanner
    .listFiles(path.join(ROOT, "backend", "src", "app", "api"))
    .filter((f) => f.endsWith("route.ts"));

  // Componentes importantes
  const rdoHistory = frontendPages.find((p) => p.includes("RDOHistory"));
  const notificationLogic = scanner
    .listFiles(path.join(ROOT, "frontend", "src", "components"))
    .find((f) => f.includes("GlobalInitializer"));

  const outputs = [
    "Regra de idioma: pt-BR",
    `Frontend: ${frontendPages.length} páginas detectadas`,
    `Backend: ${backendRoutes.length} rotas detectadas`,
    layers.frontendExists && layers.backendExists
      ? "✅ Separação de camadas detectada (frontend/backend)"
      : "⚠️ Estrutura de camadas pode estar desalinhada",
    rdoHistory
      ? "✅ Página RDOHistory encontrada"
      : "❌ Página RDOHistory não encontrada",
    notificationLogic
      ? "✅ Sistema de notificação localizado"
      : "❌ Sistema de notificação não localizado",
  ];

  if (intent.wantsCleanup) {
    outputs.push("🧹 Intenção detectada: Limpeza e organização estrutural");
    outputs.push(
      "Sugestão: revisar duplicações, arquivos órfãos e dependências cruzadas",
    );
  }

  if (intent.wantsSolid) {
    outputs.push("📐 Intenção detectada: Aplicação de princípios SOLID");
    outputs.push("Verificar responsabilidade única em páginas e serviços");
  }

  if (intent.wantsDDD) {
    outputs.push("🏛 Intenção detectada: Organização baseada em DDD");
    outputs.push(
      "Sugerido: separar camadas em Domain, Application, Infrastructure",
    );
  }

  return {
    status: "OK",
    agent: "001_ANALYST",
    timestamp,
    instruction,
    outputs,
    data: {
      intent,
      frontendPagesCount: frontendPages.length,
      backendRoutesCount: backendRoutes.length,
      layers,
    },
  };
}
