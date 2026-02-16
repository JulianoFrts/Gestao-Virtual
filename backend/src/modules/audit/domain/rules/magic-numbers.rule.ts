import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class MagicNumbersRule implements AuditRule {
    name = "Magic Numbers";
    category = "Maintainability";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        const results: AuditResult[] = [];

        const visit = (node: ts.Node) => {
            if (ts.isNumericLiteral(node)) {
                const value = parseFloat(node.text);

                // Ignorar 0, 1, 2, 100, 1000
                if (!isNaN(value) && value > 2 && value !== 10 && value !== 100 && value !== 1000) {

                    let parent = node.parent;
                    let isDefinition = false;

                    while (parent) {
                        if (ts.isEnumMember(parent) || ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent)) {
                            // Heurística simples: se está sendo atribuído, pode ser uma definição
                            // Melhorar: checar se é const/readonly
                            if (ts.isVariableDeclaration(parent) && (parent.parent.flags & ts.NodeFlags.Const)) {
                                isDefinition = true;
                            }
                            // Se for enum, sempre é definição
                            if (ts.isEnumMember(parent)) isDefinition = true;
                            break;
                        }
                        parent = parent.parent;
                    }

                    if (!isDefinition) {
                        results.push({
                            file,
                            status: "WARN",
                            severity: "LOW",
                            message: `Magic Number detectado: ${value}`,
                            violation: "Magic Numbers",
                            suggestion: "Defina uma constante nomeada para este valor.",
                            category: this.category
                        });
                    }
                }
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return results;
    }
}
