import * as crypto from "crypto";
import { logger } from "@/lib/utils/logger";

interface CacheEntry {
    hash: string;
    lastAudit: number; // Timestamp
    violations: number;
}

export class HashCacheService {
    private cache: Map<string, CacheEntry> = new Map();

    /**
     * Verifica se o arquivo precisa ser auditado.
     * Retorna TRUE se o hash mudou ou se não está no cache.
     */
    public shouldAudit(filePath: string, content: string): boolean {
        const currentHash = this.calculateHash(content);
        const cached = this.cache.get(filePath);

        if (!cached) return true;
        if (cached.hash !== currentHash) return true;

        return false;
    }

    /**
     * Atualiza o cache após uma auditoria bem sucedida.
     */
    public updateCache(filePath: string, content: string, violationCount: number) {
        const hash = this.calculateHash(content);
        this.cache.set(filePath, {
            hash,
            lastAudit: Date.now(),
            violations: violationCount
        });
    }

    /**
     * Limpa o cache (útil para forçar re-auditoria)
     */
    public clearCache() {
        this.cache.clear();
        logger.info("Audit Hash Cache limpo.");
    }

    private calculateHash(content: string): string {
        return crypto.createHash("md5").update(content).digest("hex");
    }
}
