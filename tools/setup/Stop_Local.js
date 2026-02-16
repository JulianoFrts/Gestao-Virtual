import { execSync } from 'child_process';

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function stopByPort(port, label) {
    try {
        // No Windows, busca o PID ouvindo na porta
        const output = execSync(`netstat -ano | findstr :${port}`).toString();
        const lines = output.split('\n');
        
        let pids = new Set();
        lines.forEach(line => {
            const parts = line.trim().split(/\s+/);
            if (parts.length > 4) {
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0') pids.add(pid);
            }
        });

        if (pids.size > 0) {
            pids.forEach(pid => {
                try {
                    execSync(`taskkill /F /PID ${pid} /T`);
                    log(`✅ ${label} (PID ${pid}) encerrado na porta ${port}.`, colors.green);
                } catch (e) {
                    log(`⚠️ Falha ao encerrar PID ${pid} para ${label}.`, colors.yellow);
                }
            });
        } else {
            log(`ℹ️ ${label} não parece estar rodando na porta ${port}.`, colors.cyan);
        }
    } catch (e) {
        log(`ℹ️ ${label} não encontrado na porta ${port}.`, colors.cyan);
    }
}

log("===================================================", colors.red);
log("🛑 ENCERRANDO SERVIÇOS ORIsON", colors.bright + colors.red);
log("===================================================", colors.red);

stopByPort(3000, "BACKEND");
stopByPort(5173, "FRONTEND");

log("\n✨ Todos os serviços locais foram processados.\n", colors.green);
