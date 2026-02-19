import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class PrimitiveObsessionRule implements AuditRule {
    name = "Primitive Obsession";
    category = "Maintainability";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        const results: AuditResult[] = [];
        const MAX_PRIMITIVE_STATES = 5;
        const statePattern = /(?:status|type|state|mode)\s*(?:===?|!==?)\s*['"]\w+['"]/gi;
        const matches = content.match(statePattern) || [];

        if (matches.length > MAX_PRIMITIVE_STATES) {
            results.push({
                file,
                status: "WARN",
                severity: "LOW",
                message: `Uso excessivo de estados string (${matches.length}x).`,
                violation: "Obsessão por Primitivos",
                suggestion: "Use Enums ou Tipos.",
            });
        }

        return results;
    }
}
