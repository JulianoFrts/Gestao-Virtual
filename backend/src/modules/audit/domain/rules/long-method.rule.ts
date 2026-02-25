import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class LongMethodRule implements AuditRule {
    name = "Long Method";
    category = "Maintainability";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        const results: AuditResult[] = [];

        const visit = (node: ts.Node) => {
            if (
                ts.isFunctionDeclaration(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isArrowFunction(node) ||
                ts.isFunctionExpression(node)
            ) {
                if (!node.body) return;

                const start = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line;
                const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line;
                const lines = end - start;

                if (lines > 70) {
                    results.push({
                        file,
                        status: "WARN",
                        severity: "LOW",
                        message: `Função/Método na linha ${start + 1} possui ${lines} linhas.`,
                        violation: "Long Method",
                        suggestion: "Extraia blocos lógicos para métodos auxiliares.",
                    });
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return results;
    }
}
