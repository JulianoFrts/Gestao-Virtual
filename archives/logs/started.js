import { spawn, execSync, exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendDir = __dirname;
const rootDir = path.resolve(__dirname, "..", "frontend");

/**
 * REGRA DE OURO: Carregar configurações do .env
 */
function loadEnv() {
  const envPath = path.join(backendDir, ".env.local");
  const envDefaultPath = path.join(backendDir, ".env");
  const content = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : fs.existsSync(envDefaultPath)
      ? fs.readFileSync(envDefaultPath, "utf8")
      : "";

  const config = {};
  content.split("\n").forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      let value = match[2] ? match[2].trim() : "";
      if (value.startsWith('"') && value.endsWith('"'))
        value = value.slice(1, -1);
      if (value.startsWith("'") && value.endsWith("'"))
        value = value.slice(1, -1);
      config[match[1]] = value;
    }
  });
  return config;
}

const env = loadEnv();
env.PRISMA_CLIENT_ENGINE_TYPE = "library";
env.NODE_ENV = env.NODE_ENV || "development";
// Garantir que a URL do banco esteja exposta
process.env.DATABASE_URL = env.DATABASE_URL || process.env.DATABASE_URL;
const BACKEND_URL = env.NEXTAUTH_URL || "http://localhost:3000";
const BACKEND_URL1 =
  "http://localhost:3000/docs#/Users/get_api_v1_users_profile";
const BACKEND_PORT = new URL(BACKEND_URL).port || 3000;
const FRONTEND_URL = "http://localhost:5173"; // Porta padrão do Vite solicitada pelo usuário
const PRISMA_PORT = 5555;

// Cores para console
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Mata processos nas portas específicas (evita matar o próprio script)
 */
function killProcessesOnPorts() {
  log("\n🔪 Encerrando processos nas portas do sistema...", "yellow");

  const ports = [BACKEND_PORT, PRISMA_PORT, 8080, 8081];

  ports.forEach((port) => {
    try {
      const result = execSync(
        `netstat -ano | findstr :${port} | findstr LISTENING`,
        { encoding: "utf8", stdio: "pipe" },
      );
      const lines = result.trim().split("\n");

      lines.forEach((line) => {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];

        if (pid && pid !== process.pid.toString() && !isNaN(parseInt(pid))) {
          try {
            execSync(`taskkill /F /PID ${pid} 2>nul`, { stdio: "pipe" });
            log(
              `   ✅ Processo na porta ${port} (PID ${pid}) encerrado`,
              "green",
            );
          } catch {
            /* Ignorar erro ao tentar matar processo */
          }
        }
      });
    } catch {
      log(`   ℹ️ Porta ${port} livre`, "cyan");
    }
  });

  log("   ⏳ Aguardando liberação das portas...", "cyan");
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearCaches() {
  log("\n🧹 Limpando caches do servidor...", "yellow");

  const cacheDirs = [
    path.join(backendDir, ".next"),
    path.join(backendDir, ".turbo"),
    path.join(backendDir, "node_modules", ".cache"),
    path.join(rootDir, "node_modules", ".vite"),
    path.join(rootDir, ".vite"),
    path.join(rootDir, ".turbo"),
  ];

  cacheDirs.forEach((dir) => {
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        log(
          `   ✅ Limpo: ${path.basename(path.dirname(dir))}/${path.basename(dir)}`,
          "green",
        );
      }
    } catch (err) {
      log(`   ⚠️ Erro ao limpar ${dir}: ${err.message}`, "red");
    }
  });

  log("   ✅ Cache do servidor limpo!", "green");
}

function runCommand(command, args, cwd, name, color = "cyan") {
  const isWindows = process.platform === "win32";

  log(`[${name}] Iniciando: ${command} ${args.join(" ")}`, color);

  const proc = spawn(command, args, {
    cwd,
    shell: isWindows,
    stdio: "inherit",
    env: { ...process.env, ...env, FORCE_COLOR: "true" },
  });

  proc.on("error", (err) => {
    log(`[${name}] ❌ Erro ao iniciar processo: ${err.message}`, "red");
  });

  return proc;
}

function openBrowserWithCleanCache() {
  log("\n🌐 Abrindo navegador...", "magenta");

  const targetUrl = FRONTEND_URL;
  const isWindows = process.platform === "win32";

  if (isWindows) {
    // Tenta Edge InPrivate
    exec(`start msedge --inprivate ${targetUrl}`, (err) => {
      if (err) {
        // Se falhar, tenta Chrome Incognito
        exec(`start chrome --incognito ${targetUrl}`, (browserErr) => {
          if (browserErr) {
            // Se falhar, abre no padrão
            exec(`start ${targetUrl}`);
          }
        });
      }
    });
  }

  log(`   📱 Acesse manualmente se não abrir: ${targetUrl}`, "cyan");
}

async function run() {
  console.clear();
  log(
    "═══════════════════════════════════════════════════════════════",
    "cyan",
  );
  log("       🚀 GESTÃO VIRTUAL - INICIALIZAÇÃO COMPLETA", "bright");
  log(
    "═══════════════════════════════════════════════════════════════",
    "cyan",
  );

  // INFO: Regra de Ouro Check
  if (env.JWT_SECRET || env.TOKEN_SECRET) {
    log("🔒 TOKEN_SECRET detectado no ambiente", "green");
  } else {
    log("⚠️  AVISO: TOKEN_SECRET não configurado!", "red");
  }

  killProcessesOnPorts();
  await delay(1500);
  clearCaches();

  log("\n🔧 Iniciando serviços...", "yellow");

  // Sync Automático de Permissões (Constants -> DB)
  log("\n🔄 Sincronizando permissões e hierarquia...", "blue");
  try {
    execSync("npm run sync:permissions", { cwd: backendDir, stdio: "inherit" });
    log("✅ Permissões sincronizadas com sucesso!", "green");
  } catch {
    log(
      "⚠️ Falha ao sincronizar permissões. O banco pode estar desatualizado.",
      "red",
    );
  }

  // Iniciar Serviços
  const frontend = runCommand(
    "npm",
    ["run", "dev"],
    rootDir,
    "Frontend",
    "green",
  );
  const backend = runCommand(
    "npm",
    ["run", "dev"],
    backendDir,
    "Backend",
    "blue",
  );
  const prisma = runCommand(
    "npx",
    ["prisma", "studio"],
    backendDir,
    "Prisma",
    "magenta",
  );
  const worker = runCommand(
    "npx",
    ["tsx", "worker.ts"],
    backendDir,
    "Worker",
    "cyan",
  );

  log("\n✅ Todos os serviços iniciados!", "green");
  log("⏳ Aguardando 3 segundos para os servidores subirem...", "yellow");

  await delay(3500);

  openBrowserWithCleanCache();

  log(
    "\n═══════════════════════════════════════════════════════════════",
    "cyan",
  );
  log(`   📱 Frontend:      ${FRONTEND_URL}`, "green");
  log(`   🔧 Backend API:   ${BACKEND_URL1}/api/v1`, "blue");
  log(`   🗄️ Prisma Studio:   http://localhost:${PRISMA_PORT}`, "magenta");
  log(
    "═══════════════════════════════════════════════════════════════",
    "cyan",
  );
  log("\n   Pressione Ctrl+C para encerrar todos os serviços\n", "yellow");

  process.on("SIGINT", () => {
    log("\n\n👋 Encerrando todos os processos...", "yellow");
    frontend?.kill();
    backend?.kill();
    prisma?.kill();
    worker?.kill();
    log("✅ Sistema ORION encerrado com sucesso!", "green");
    process.exit();
  });
}

run();
