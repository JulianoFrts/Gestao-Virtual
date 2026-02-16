import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class SingleResponsibilityRule implements AuditRule {
    name = "Single Responsibility Principle";
    category = "Architecture";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        const results: AuditResult[] = [];

        const lines = sourceFile.getLineAndCharacterOfPosition(sourceFile.end).line;

        if (lines > 600) {
            results.push({
                file,
                status: "FAIL",
                severity: "HIGH",
                message: `Arquivo gigante (${lines} linhas). Violação crítica de SRP.`,
                violation: "Single Responsibility Principle violation",
                suggestion: "Divida este arquivo em componentes/módulos menores.",
                category: this.category
            });
        } else if (lines > 400) {
            results.push({
                file,
                status: "WARN",
                severity: "MEDIUM",
                message: `Arquivo grande (${lines} linhas). Risco de SRP.`,
                violation: "Single Responsibility Principle warning",
                suggestion: "Considere refatorar para manter coesão.",
                category: this.category
            });
        }

        return results;
    }
}
