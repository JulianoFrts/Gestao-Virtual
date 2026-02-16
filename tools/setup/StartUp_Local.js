import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isBackground =
  process.argv.includes("--bg") || process.argv.includes("-b");
const logsDir = path.join(__dirname, ".logs");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function startProcess(command, args, label, color, cwd = __dirname) {
  const env = {
    ...process.env,
    NODE_OPTIONS: "--max-old-space-size=4096", // Aumentar limite de memória para evitar travamentos
    FORCE_COLOR: "1", // Garantir cores no terminal
  };

  if (isBackground) {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);
    const logFile = path.join(logsDir, `${label.toLowerCase()}.log`);
    const out = fs.openSync(logFile, "a");
    const err = fs.openSync(logFile, "a");

    const proc = spawn(command, args, {
      stdio: ["ignore", out, err],
      detached: true,
      shell: true,
      windowsHide: true,
      cwd,
      env
    });

    proc.unref();
    log(
      `▶ ${label} iniciado em segundo plano. Logs em: .logs/${label.toLowerCase()}.log`,
      color,
    );
    return proc;
  }

  const proc = spawn(command, args, { stdio: "pipe", shell: true, cwd, env });

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${color}[${label}]${colors.reset} ${line}`);
      }
    });
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        console.log(`${colors.red}[${label} ERR]${colors.reset} ${line}`);
      }
    });
  });

  return proc;
}

async function start() {
  if (!isBackground) console.clear();
  log("===================================================", colors.cyan);
  log(
    "🚀 INICIANDO SISTEMA ORIsON EM AMBIENTE HÍBRIDO",
    colors.bright + colors.cyan,
  );
  log("(DB no Docker + App Local)", colors.cyan);
  if (isBackground) log("MODO: SEGUNDO PLANO (BACKGROUND)", colors.yellow);
  log("===================================================", colors.cyan);

  try {
    // 0. Docker Check (Opcional - só se não usar --lite)
    const isLite = process.argv.includes("--lite");

    if (!isLite) {
      log(
        "\n🐳 Passo 0: Garantindo que o Banco de Dados (Docker) está online...",
        colors.yellow,
      );
      try {
        // Timeout maior para sistemas Windows mais lentos
        execSync("docker info", { stdio: "ignore", timeout: 10000 });
        execSync("docker-compose up -d db", { stdio: "inherit", timeout: 20000 });
        log("✅ Banco de Dados iniciado via Docker.", colors.green);
      } catch (e) {
        log(
          "\n⚠️ ALERTA: Docker inativo ou respondendo muito devagar (Skipping)...",
          colors.yellow,
        );
      }
    } else {
      log("\n🚀 MODO LITE ATIVADO: Pulando verificação do Docker.", colors.green);
    }

    log("\n⚡ Parando processos anteriores...", colors.red + colors.bright);
    try {
      execSync("npm run dev:stop", { stdio: "ignore" });
    } catch (e) { }

    // ... (rest of the code)

    // 1.1 Gerar Prisma Client (Fast skip se existir)
    if (!isLite || !fs.existsSync(path.join(__dirname, "backend/node_modules/.prisma"))) {
      log("\n�️ Passo 1.1: Gerando Prisma Client...", colors.yellow);
      try {
        execSync("npx prisma generate", {
          cwd: path.join(__dirname, "backend"),
          stdio: "inherit",
        });
        log("✅ Prisma Client gerado.", colors.green);
      } catch (e) {
        log("⚠️ Falha ao gerar Prisma Client.", colors.red);
      }
    }

    // Comandos diretos usando node para evitar problemas com espaços no PATH/NPX do Windows
    const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");
    const viteBin = path.join(__dirname, "node_modules", "vite", "bin", "vite.js");
    const tsxBin = path.join(__dirname, "node_modules", "tsx", "dist", "cli.mjs");

    log("\n⚡ Passo 2: Iniciando serviços (Modo Robusto)...", colors.yellow);

    const backend = startProcess(
      "node",
      [`"${nextBin}"`, "dev", "-p", "3000"],
      "BACKEND",
      colors.blue,
      path.join(__dirname, "backend")
    );

    const frontend = startProcess(
      "node",
      [`"${viteBin}"`],
      "FRONTEND",
      colors.green,
      path.join(__dirname, "frontend")
    );

    const worker = !isLite ? startProcess(
      "node",
      [`"${tsxBin}"`, "worker.ts"],
      "WORKER",
      colors.yellow,
      path.join(__dirname, "backend")
    ) : null;

    log("\n===================================================", colors.cyan);
    log("🛸 SERVIÇOS LANÇADOS!", colors.bright + colors.green);
    log("Frontend:     http://localhost:5173", colors.blue);
    log("Backend API:  http://localhost:3000", colors.blue);
    log("Worker:       Processando fila de Jobs", colors.yellow);
    log("===================================================", colors.cyan);

    // 3. Abrir Navegador (Opcional - mas útil)
    const shouldClear =
      process.argv.includes("--clear") || process.argv.includes("-c");
    const url = `http://localhost:5173${shouldClear ? "?clearData=true" : ""}`;

    setTimeout(() => {
      log(`\n🌍 Abrindo navegador em: ${url}`, colors.cyan);
      const startCommand = process.platform === "win32" ? "start" : "open";
      try {
        execSync(`${startCommand} ${url}`);
      } catch (e) {
        log(
          "⚠️ Não foi possível abrir o navegador automaticamente.",
          colors.yellow,
        );
      }
    }, 3000);

    if (isBackground) {
      log(
        "\nO console está livre para uso. Use 'node Stop_Local.js' para encerrar.",
        colors.yellow,
      );
      process.exit(0);
    } else {
      log("Pressione Ctrl+C para encerrar todos os serviços.\n", colors.yellow);
      process.on("SIGINT", () => {
        log("\n🛑 Encerrando serviços...", colors.red);
        backend.kill();
        frontend.kill();
        worker.kill();
        process.exit();
      });
    }
  } catch (error) {
    log("\n❌ ERRO DURANTE A EXECUÇÃO:", colors.red + colors.bright);
    log(error.message, colors.red);
    process.exit(1);
  }
}

start();
