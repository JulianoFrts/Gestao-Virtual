import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..", "..");

function detectIntent(instruction = "") {
  const text = instruction.toLowerCase();
  return {
    wantsDeepAudit: text.includes("profunda") || text.includes("completa"),
    wantsSecurity: text.includes("segurança"),
    wantsPermissions: text.includes("permiss"),
  };
}

function fileExists(relativePath) {
  return fs.existsSync(path.join(ROOT, relativePath));
}

export async function run(context = {}) {
  const timestamp = new Date().toISOString();
  const instruction = context.instruction || "";
  const intent = detectIntent(instruction);

  const configPath = path.join(ROOT, "frontend", "src", "routes", "config.tsx");
  const historyPath = path.join(
    ROOT,
    "frontend",
    "src",
    "pages",
    "RDOHistory.tsx",
  );
  const protectedRoutePath = path.join(
    ROOT,
    "frontend",
    "src",
    "routes",
    "ProtectedRoute.tsx",
  );

  let rdoRouteVerified = false;
  let usesProtectedRoute = false;
  let usesAuth = false;

  if (fs.existsSync(configPath)) {
    const content = fs.readFileSync(configPath, "utf8");
    rdoRouteVerified = content.includes("/rdo/history");
  }

  if (fs.existsSync(protectedRoutePath)) {
    usesProtectedRoute = true;
  }

  if (fs.existsSync(historyPath)) {
    const content = fs.readFileSync(historyPath, "utf8");
    usesAuth = content.includes("useAuth");
  }

  let riskLevel = "Baixo";

  if (!rdoRouteVerified || !usesProtectedRoute || !usesAuth) {
    riskLevel = "Médio";
  }

  if (!rdoRouteVerified && !usesProtectedRoute) {
    riskLevel = "Alto";
  }

  const outputs = [
    "Idioma: pt-BR",
    rdoRouteVerified
      ? "✅ Rota /rdo/history registrada"
      : "❌ Rota /rdo/history não encontrada",
    usesProtectedRoute
      ? "✅ ProtectedRoute detectado"
      : "⚠️ ProtectedRoute não localizado",
    usesAuth ? "✅ useAuth utilizado na página" : "⚠️ useAuth não detectado",
    `Nível de Risco: ${riskLevel}`,
  ];

  if (intent.wantsDeepAudit) {
    outputs.push(
      "🔎 Auditoria profunda solicitada: verificar backend para validação de permissões.",
    );
  }

  if (intent.wantsSecurity) {
    outputs.push("🛡 Sugestão: validar imutabilidade também no backend.");
  }

  if (intent.wantsPermissions) {
    outputs.push("🔐 Verificar roles e guards adicionais.");
  }

  return {
    status: "OK",
    agent: "004_AUDITOR",
    timestamp,
    instruction,
    outputs,
    findings: {
      rdoRouteVerified,
      usesProtectedRoute,
      usesAuth,
      riskLevel,
    },
  };
}
