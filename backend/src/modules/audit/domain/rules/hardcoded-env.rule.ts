import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class HardcodedEnvironmentRule implements AuditRule {
    name = "Hardcoded Environment";
    category = "Security";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        const results: AuditResult[] = [];
        const APP_URL = process.env.APP_URL || "https://orion.gestaovirtual.com";

        const LOCALHOST_PATTERN = "local" + "host:";
        if (
            content.includes(LOCALHOST_PATTERN) &&
            !file.includes("config") &&
            !file.includes("client") &&
            !file.includes("AuditScanner") &&
            !file.includes("hardcoded-env.rule")
        ) {
            results.push({
                file,
                status: "WARN",
                severity: "MEDIUM",
                message: "URL localhost hardcoded.",
                violation: "Ambiente Hardcoded",
                suggestion: `Use variáveis de ambiente (APP_URL=${APP_URL}).`,
            });
        }

        return results;
    }
}
