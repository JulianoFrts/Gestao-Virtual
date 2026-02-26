import { logger } from "@/lib/utils/logger";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

/**
 * Carrega variáveis de ambiente manualmente para scripts standalone
 */
export function loadEnv() {
  const cwd = process.cwd();
  
  // Lista de possíveis locais para o arquivo .env
  const possiblePaths = [
    path.join(cwd, ".env.local"),
    path.join(cwd, ".env"),
    path.join(cwd, "backend", ".env.local"),
    path.join(cwd, "backend", ".env"),
  ];

  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      logger.debug(`[Env] Carregado: ${envPath}`);
      return;
    }
  }
  
  console.warn("[Env] Nenhum arquivo .env encontrado!");
}
