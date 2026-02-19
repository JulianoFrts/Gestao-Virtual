import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class DDDViolationRule implements AuditRule {
    name = "DDD Layers Violation";
    category = "Architecture";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        if (!file.includes("route.ts") && !file.includes("controller")) return [];
        
        const results: AuditResult[] = [];

        const visit = (node: ts.Node) => {
            if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
                const expression = node.expression as ts.PropertyAccessExpression;
                const propName = expression.name.text;

                if (
                    ["create", "update", "delete", "upsert"].includes(propName) &&
                    expression.expression.getText().includes("prisma")
                ) {
                    results.push({
                        file,
                        status: "WARN",
                        severity: "MEDIUM",
                        message: "Persistência direta na camada de Rota/Controlador.",
                        violation: "Violação de Camada (DDD)",
                        suggestion: "Mova a persistência para um Serviço ou Repositório.",
                    });
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return results;
    }
}
