import { spawn, execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isBackground =
  process.argv.includes("--bg") || process.argv.includes("-b");
const rootDir = path.resolve(__dirname, "../../");
const logsDir = path.join(rootDir, "archives/logs");

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

function summarizeValue(val) {
  if (typeof val === "string" && val.length > 50) {
    return `${val.slice(0, 10)}... [+${val.length - 10} chars]`;
  }
  if (Array.isArray(val)) {
    return val.map(summarizeValue);
  }
  if (val !== null && typeof val === "object") {
    const obj = {};
    for (const key in val) {
      obj[key] = summarizeValue(val[key]);
    }
    return obj;
  }
  return val;
}

function startProcess(
  command,
  args,
  label,
  color,
  cwd = rootDir,
  extraEnv = {},
) {
  const env = {
    ...process.env,
    ...extraEnv,
    NODE_OPTIONS: "--max-old-space-size=4096", // Aumentar limite de memória para evitar travamentos
    FORCE_COLOR: "1", // Garantir cores no terminal
  };

  if (isBackground) {
    if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
    const logFile = path.join(logsDir, `${label.toLowerCase()}.log`);
    const out = fs.openSync(logFile, "a");
    const err = fs.openSync(logFile, "a");

    const proc = spawn(command, args, {
      stdio: ["ignore", out, err],
      detached: true,
      shell: true,
      windowsHide: true,
      cwd,
      env,
    });

    proc.unref();
    log(
      `▶ ${label} iniciado em segundo plano. Logs em: archives/logs/${label.toLowerCase()}.log`,
      color,
    );
    return proc;
  }

  const proc = spawn(command, args, { stdio: "pipe", shell: true, cwd, env });

  let stdoutBuffer = "";
  proc.stdout.on("data", (data) => {
    stdoutBuffer += data.toString();
    const lines = stdoutBuffer.split("\n");
    stdoutBuffer = lines.pop() || "";

    let currentRawObject = null;
    let rawObjectLines = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Suporte a Pino JSON Logs (Visualização Premium)
      if (trimmed.startsWith('{"level":')) {
        try {
          const pinoLog = JSON.parse(trimmed);
          const { level, time, msg, logType, ...context } = pinoLog;

          // 1. Filtro de Ruído: Omitir Health Checks bem-sucedidos
          if (msg.includes("/api/v1/health") && level <= 30) return;
          if (context.url?.includes("/api/v1/health") && level <= 30) return;
          if (msg.includes("Response JSON") && context.data?.status === "ok")
            return;

          // 2. Simplificação de Metadados: Ocultar headers redundantes
          if (context.headers) {
            const noisyHeaders = [
              "sec-ch-ua",
              "sec-ch-ua-mobile",
              "sec-ch-ua-platform",
              "sec-fetch-dest",
              "sec-fetch-mode",
              "sec-fetch-site",
              "accept-encoding",
              "accept-language",
              "connection",
              "accept",
              "purpose",
              "host",
              "origin",
              "referer",
              "user-agent",
              "x-forwarded-for",
              "x-forwarded-host",
              "x-forwarded-port",
              "x-forwarded-proto",
            ];
            noisyHeaders.forEach((h) => delete context.headers[h]);
            if (Object.keys(context.headers).length === 0)
              delete context.headers;
          }

          const timeStr = new Date(time || Date.now()).toLocaleTimeString();

          let levelName = "INFO";
          let levelColor = colors.reset;
          let icon = "ℹ️";

          if (level <= 10) {
            levelName = "TEST";
            levelColor = colors.bright;
            icon = "🧪";
          } else if (level <= 20) {
            levelName = "TRACE";
            levelColor = "\x1b[90m"; // Gray
            icon = "🔍";
          } else if (level <= 30) {
            levelName = "DEBUG";
            levelColor = colors.blue;
            icon = "🛰️";
          } else if (logType === "success" || level === 38) {
            levelName = "SUCCESS";
            levelColor = colors.green;
            icon = "✅";
          } else if (level === 40) {
            levelName = "WARN";
            levelColor = colors.yellow;
            icon = "⚠️";
          } else if (level >= 50) {
            levelName = "ERROR";
            levelColor = colors.red;
            icon = "❌";
          }

          // Formatar o Header da linha
          let formattedMsg = colors.bright + msg + colors.reset;

          // Especial: Colorir logs de HTTP / Request
          if (msg.startsWith("HTTP ") || msg.startsWith("Request ")) {
            const parts = msg.split(" ");
            if (parts.length >= 3) {
              const method = parts[1];
              const pathStr = parts[2];
              const status = parts[3] || "";

              const methodColor =
                method === "GET"
                  ? colors.green
                  : method === "POST"
                    ? colors.cyan
                    : colors.yellow;
              const statusColor = status.startsWith("2")
                ? colors.green
                : status.startsWith("4")
                  ? colors.yellow
                  : status.startsWith("5")
                    ? colors.red
                    : colors.reset;

              formattedMsg = `${colors.bright}${parts[0]}${colors.reset} ${methodColor}${method}${colors.reset} ${colors.bright}${pathStr}${colors.reset} ${statusColor}${status}${colors.reset}${msg.slice(msg.indexOf("(") !== -1 ? msg.indexOf("(") - 1 : msg.length)}`;
            }
          }

          const header = `${color}[${label}]${colors.reset} ${colors.cyan}[${timeStr}]${colors.reset} ${levelColor}${icon} [${levelName}]${colors.reset} ${formattedMsg}`;
          console.log(header);

          // Se houver contexto (metadata), exibir de forma indentada e bonita (Resumindo strings longas)
          if (Object.keys(context).length > 0) {
            const summarizedContext = summarizeValue(context);
            const contextStr = JSON.stringify(summarizedContext, null, 2)
              .split("\n")
              .map(
                (l) =>
                  `${color}[${label}]${colors.reset}   ${colors.cyan}│${colors.reset} ${l}`,
              )
              .join("\n");
            console.log(contextStr);
          }
          return;
        } catch (e) {
          // Fallback se o JSON for inválido
        }
      }

      // Detector de Objetos brutos (Multi-linha)
      if (trimmed === "{") {
        currentRawObject = true;
        rawObjectLines = ["{"];
        return;
      }
      if (currentRawObject) {
        rawObjectLines.push(line);
        if (
          trimmed === "}" ||
          (trimmed.startsWith("}") && trimmed.length < 5)
        ) {
          const joined = rawObjectLines.join("\n");

          // Filtro de Health Check em bloco bruto
          if (joined.includes("/api/v1/health")) {
            currentRawObject = null;
            rawObjectLines = [];
            return;
          }

          // Tentar truncar strings longas no bloco bruto antes de imprimir
          const processed = joined
            .replace(/'([^']{50,})'/g, (match, p1) => {
              return `'${p1.slice(0, 10)}... [+${p1.length - 10} chars]'`;
            })
            .replace(/"([^"]{50,})"/g, (match, p1) => {
              return `"${p1.slice(0, 10)}... [+${p1.length - 10} chars]"`;
            });

          console.log(`${color}[${label}]${colors.reset} ${processed}`);
          currentRawObject = null;
          rawObjectLines = [];
          return;
        }
        return;
      }

      // Filtro Final: Evita logs "brutos" de health residuais
      if (
        trimmed.includes("/api/v1/health") ||
        trimmed.includes("Request GET /api/v1/health") ||
        trimmed.includes("Response JSON 200")
      ) {
        if (
          trimmed.includes('status": 200') ||
          trimmed.includes('"status": "ok"')
        )
          return;
      }

      console.log(`${color}[${label}]${colors.reset} ${line}`);
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
    const isLite = process.argv.includes("--lite") || true; // Forcing lite for AI environment unless dockers are available

    if (!isLite) {
      log(
        "\n🐳 Passo 0: Garantindo que o Banco de Dados (Docker) está online...",
        colors.yellow,
      );
      try {
        // Timeout maior para sistemas Windows mais lentos
        execSync("docker info", { stdio: "ignore", timeout: 10000 });
        execSync("docker-compose up -d db", {
          stdio: "inherit",
          timeout: 20000,
        });
        log("✅ Banco de Dados iniciado via Docker.", colors.green);
      } catch (e) {
        log(
          "\n⚠️ ALERTA: Docker inativo ou respondendo muito devagar (Skipping)...",
          colors.yellow,
        );
      }
    } else {
      log(
        "\n🚀 MODO LITE ATIVADO: Pulando verificação do Docker.",
        colors.green,
      );
    }

    log("\n⚡ Parando processos anteriores...", colors.red + colors.bright);
    try {
      execSync("npm run dev:stop", { stdio: "ignore", cwd: rootDir });
    } catch (e) {}

    // ... (rest of the code)

    // 1.1 Gerar Prisma Client (Fast skip se existir)
    const backendDir = path.join(rootDir, "backend");
    const frontendDir = path.join(rootDir, "frontend");

    if (
      !isLite ||
      !fs.existsSync(path.join(backendDir, "node_modules/.prisma"))
    ) {
      log("\n️ Passo 1.1: Gerando Prisma Client...", colors.yellow);
      try {
        execSync("npx prisma generate", {
          cwd: backendDir,
          stdio: "inherit",
        });
        log("✅ Prisma Client gerado.", colors.green);
      } catch (e) {
        log("⚠️ Falha ao gerar Prisma Client.", colors.red);
      }
    }

    // Comandos diretos usando node para evitar problemas com espaços no PATH/NPX do Windows
    const nextBin = path.join(
      rootDir,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next",
    );
    const viteBin = path.join(
      rootDir,
      "node_modules",
      "vite",
      "bin",
      "vite.js",
    );
    const tsxBin = path.join(rootDir, "node_modules", "tsx", "dist", "cli.mjs");

    log("\n⚡ Passo 2: Iniciando serviços (Modo Robusto)...", colors.yellow);

    const backend = startProcess(
      "npm",
      ["run", "dev", "-w", "backend"],
      "BACKEND",
      colors.blue,
      rootDir,
    );

    const frontend = startProcess(
      "node",
      [`"${viteBin}"`],
      "FRONTEND",
      colors.green,
      frontendDir,
    );

    const worker = startProcess(
      "node",
      [`"${tsxBin}"`, "worker.ts"],
      "WORKER",
      colors.yellow,
      path.join(rootDir, "backend"),
    );

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
        if (backend) backend.kill();
        if (frontend) frontend.kill();
        if (worker) worker.kill();
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
