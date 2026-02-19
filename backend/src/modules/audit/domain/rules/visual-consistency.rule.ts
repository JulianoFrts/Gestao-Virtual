import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class VisualConsistencyRule implements AuditRule {
    name = "Visual Consistency";
    category = "Design";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        if (!file.endsWith(".tsx")) return [];
        if (file.includes("index.css") || file.includes("tailwind.config")) return [];

        const results: AuditResult[] = [];
        const MAX_COLOR_VIOLATIONS = 5;
        const problematicColorsPattern = /(?:text|bg|border|ring|shadow)-(?:orange|amber)-(?:400|500|600|700)/g;
        const matches = content.match(problematicColorsPattern) || [];
        const uniqueColors = [...new Set(matches)];

        if (uniqueColors.length > 0 && matches.length > MAX_COLOR_VIOLATIONS) {
            results.push({
                file,
                status: "WARN",
                severity: "LOW",
                message: `Cores fora do padrão: ${uniqueColors.join(", ")}.`,
                violation: "Inconsistência Visual",
                suggestion: "Use variáveis de tema (primary/secondary).",
            });
        }

        return results;
    }
}
