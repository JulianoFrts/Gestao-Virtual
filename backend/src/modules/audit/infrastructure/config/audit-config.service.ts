import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import { logger } from "@/lib/utils/logger";

const auditConfigSchema = z.object({
    rules: z.record(z.string(), z.union([z.boolean(), z.string(), z.array(z.any())])),
    ignore: z.array(z.string()).optional(),
});

export type AuditConfig = z.infer<typeof auditConfigSchema>;

export class AuditConfigService {
    private config: AuditConfig | null = null;
    private readonly configPath = path.join(process.cwd(), ".auditrc.json");

    public loadConfig(): AuditConfig {
        if (this.config) return this.config;

        try {
            if (!fs.existsSync(this.configPath)) {
                logger.info("Nenhum arquivo .auditrc.json encontrado. Usando padrões.");
                this.config = this.getDefaultConfig();
                return this.config;
            }

            const content = fs.readFileSync(this.configPath, "utf-8");
            const parsed = JSON.parse(content);

            const validation = auditConfigSchema.safeParse(parsed);

            if (!validation.success) {
                logger.warn("Arquivo .auditrc.json inválido. Usando padrões.", { issues: validation.error.issues });
                this.config = this.getDefaultConfig();
                return this.config;
            }

            this.config = validation.data;
            logger.info("Configuração de auditoria carregada com sucesso.");
            return this.config;
        } catch (error) {
            logger.error("Erro ao carregar .auditrc.json", { error });
            this.config = this.getDefaultConfig();
            return this.config;
        }
    }

    public getEnabledRules(): string[] {
        const config = this.loadConfig();
        return Object.entries(config.rules)
            .filter(([_, value]) => {
                if (typeof value === "boolean") return value;
                if (Array.isArray(value)) return value[0] !== "off";
                return value !== "off";
            })
            .map(([key]) => key);
    }

    public getIgnorePatterns(): string[] {
        return this.loadConfig().ignore || [];
    }

    private getDefaultConfig(): AuditConfig {
        return {
            rules: {
                "srp": true,
                "long-method": true,
                "magic-numbers": true,
                "ddd-violation": true
            },
            ignore: ["node_modules", ".next", "dist", "coverage"]
        };
    }
}
