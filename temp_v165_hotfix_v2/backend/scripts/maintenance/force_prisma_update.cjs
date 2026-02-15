const { execSync } = require("child_process");

function killPort(port) {
  try {
    console.log(`🔍 Buscando processos na porta ${port}...`);
    const result = execSync(
      `netstat -ano | findstr :${port} | findstr LISTENING`,
      { encoding: "utf8" },
    );
    const lines = result.trim().split("\n");
    lines.forEach((line) => {
      const pid = line.trim().split(/\s+/).pop();
      if (pid) {
        console.log(`🔪 Matando processo na porta ${port} (PID: ${pid})...`);
        execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore" });
      }
    });
  } catch (e) {
    console.log(`ℹ️ Porta ${port} já está livre.`);
  }
}

console.log("🛑 Parando serviços para atualizar banco de dados...");
killPort(3000);
killPort(5555);

try {
  console.log("🔄 Atualizando schemas do Prisma...");
  execSync("npx prisma generate", { stdio: "inherit" });
  console.log("✅ Prisma Generate concluído com sucesso.");
} catch (e) {
  console.error("❌ Erro ao rodar prisma generate:", e.message);
}
