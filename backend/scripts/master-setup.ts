import "dotenv/config";
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

async function runCommand(command: string) {
  console.log(`\n🚀 Executando: ${command}`);
  console.log(`📁 CWD: ${process.cwd()}`);
  try {
    // No Windows, cmd.exe /c costuma ser mais previsível para npx
    const shell = process.platform === "win32" ? "cmd.exe" : "/bin/sh";
    execSync(command, {
      stdio: "inherit",
      shell: shell,
      env: { ...process.env, PRISMA_CLIENT_ENGINE_TYPE: "library" }
    });
    console.log(`✅ Sucesso: ${command}`);
  } catch (error: any) {
    console.error(`\n❌ Falha ao executar comando: ${command}`);
    console.error(`Erro: ${error.message}`);
    if (error.stderr) console.error(`Stderr: ${error.stderr.toString()}`);
    if (error.stdout) console.log(`Stdout: ${error.stdout.toString()}`);
    throw error;
  }
}

async function checkBackups() {
  const backupDir = path.join(process.cwd(), "prisma", "seeds-backup");
  if (fs.existsSync(backupDir)) {
    const files = fs.readdirSync(backupDir).filter(f => f.endsWith(".json"));
    if (files.length > 0) {
      console.log(`📂 Detectados ${files.length} arquivos de backup para restauração.`);
      return true;
    }
  }
  console.log("ℹ️ Nenhum backup de dados reais encontrado. Usando seeds padrão.");
  return false;
}

async function main() {
  console.log("🛡️  ORIO-N DATABASE MASTER INITIALIZATION  🛡️");
  console.log("============================================");

  try {
    // 1. Gerar Prisma Client
    await runCommand("npx prisma generate");

    // 2. Sincronizar Esquema (db push é mais flexível para desenvolvimento que migrate deploy)
    await runCommand("npx prisma db push --skip-generate");

    // 3. Sincronizar Matriz de Permissões (Crítico para o sistema funcionar)
    // Usando npm run sync:permissions que chama tsx
    await runCommand("npm run sync:permissions");

    // 4. Seeding Principal / Restauração
    const hasBackups = await checkBackups();
    if (hasBackups) {
      console.log("\n🔄 Restaurando dados de backups JSON...");
      await runCommand("npm run db:restore");
      console.log("ℹ️ Restaurado a partir de arquivos locais em prisma/seeds-backup.");
    } else {
      console.log("\n🌱 Rodando seeding inicial padrão...");
      await runCommand("npm run seed");
    }

    console.log("\n✨ DATABASE PRONTO PARA USO! ✨");
    console.log("============================================");
  } catch (error) {
    console.error("\n💥 ERRO CRÍTICO NA INICIALIZAÇÃO DO BANCO:", error);
    process.exit(1);
  }
}

main();
