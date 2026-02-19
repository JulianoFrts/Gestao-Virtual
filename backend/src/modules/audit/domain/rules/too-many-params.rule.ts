import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class TooManyParametersRule implements AuditRule {
    name = "Too Many Parameters";
    category = "Maintainability";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        const results: AuditResult[] = [];
        const MAX_PARAMS = 5;

        const visit = (node: ts.Node) => {
            if (
                ts.isFunctionDeclaration(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isArrowFunction(node) ||
                ts.isFunctionExpression(node)
            ) {
                const func = node as ts.FunctionLikeDeclaration;
                if (func.parameters.length > MAX_PARAMS) {
                    results.push({
                        file,
                        status: "WARN",
                        severity: "MEDIUM",
                        message: `Função com ${func.parameters.length} parâmetros.`,
                        violation: "Muitos Parâmetros",
                        suggestion: "Use um objeto de configuração (DTO/Interface).",
                    });
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return results;
    }
}
