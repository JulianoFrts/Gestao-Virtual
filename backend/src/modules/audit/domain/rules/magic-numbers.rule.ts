import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

export class MagicNumbersRule implements AuditRule {
    name = "Magic Numbers";
    category = "Maintainability";

    execute(file: string, sourceFile: ts.SourceFile, content: string): AuditResult[] {
        if (this.shouldIgnoreFile(file)) return [];

        const results: AuditResult[] = [];
        const visit = (node: ts.Node) => {
            if (ts.isNumericLiteral(node)) {
                this.processNumericLiteral(node, file, results);
            }
            ts.forEachChild(node, visit);
        };

        visit(sourceFile);
        return results;
    }

    private shouldIgnoreFile(file: string): boolean {
        return file.includes("constants/") || file.includes("config/");
    }

    private processNumericLiteral(node: ts.NumericLiteral, file: string, results: AuditResult[]) {
        const value = parseFloat(node.text);
        if (isNaN(value) || value <= 2 || value === 10 || value === 100 || value === 1000) return;

        if (!this.isInsideDefinition(node)) {
            results.push({
                file,
                status: "WARN",
                severity: "LOW",
                message: `Magic Number detectado: ${node.text}`,
                violation: "Magic Numbers",
                suggestion: "Defina uma constante nomeada para este valor.",
                category: this.category
            });
        }
    }

    private isInsideDefinition(node: ts.Node): boolean {
        let parent = node.parent;
        while (parent) {
            if (ts.isEnumMember(parent)) return true;
            
            if (ts.isVariableDeclaration(parent)) {
                const isConst = (ts.getCombinedNodeFlags(parent) & ts.NodeFlags.Const) !== 0;
                if (isConst) return true;
            }

            if (ts.isObjectLiteralExpression(parent) && this.isParentConst(parent)) {
                return true;
            }

            parent = parent.parent;
        }
        return false;
    }

    private isParentConst(node: ts.Node): boolean {
        let current = node.parent;
        while (current) {
            if (ts.isVariableDeclaration(current)) {
                return (ts.getCombinedNodeFlags(current) & ts.NodeFlags.Const) !== 0;
            }
            current = current.parent;
        }
        return false;
    }
}
