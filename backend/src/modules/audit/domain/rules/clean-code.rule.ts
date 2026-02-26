import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

/**
 * Detecta problemas de Clean Code e Legibilidade:
 * - Nomes genéricos
 * - Ifs aninhados profundos
 * - Console.logs
 * - Código comentado (heurística)
 * - Retornos múltiplos confusos
 */
export class CleanCodeRule implements AuditRule {
  name = "Clean Code & Readability";
  category = "Maintainability";

  private readonly GENERIC_NAMES = [
    "data",
    "record",
    "value",
    "input",
    "element",
    "temp",
    "tmp",
    "res",
    "resp",
  ];
  private readonly MAX_IF_DEPTH = 3;

  execute(
    file: string,
    sourceFile: ts.SourceFile,
    content: string,
  ): AuditResult[] {
    const results: AuditResult[] = [];

    // 1. Console logs
    this.checkConsoleLogs(file, content, results);

    // 2. Nomes genéricos em variáveis/parâmetros
    this.checkGenericNames(file, sourceFile, results);

    // 3. Ifs aninhados profundos
    this.checkNestedIfs(file, sourceFile, results);

    // 4. Código comentado (heurística: linhas que parecem código mas estão comentadas)
    this.checkCommentedCode(file, content, results);

    return results;
  }

  private checkConsoleLogs(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    const logPattern = /console\.(log|debug|info|warn|error)\(/g;
    const matches = content.match(logPattern);

    if (matches && matches.length > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Presença excessiva de console.logs (${matches.length}x).`,
        violation: "Console.log esquecido",
        suggestion: "Remova logs de debug ou use um logger estruturado.",
        category: this.category,
      });
    }
  }

  private checkGenericNames(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    const badNames: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (this.GENERIC_NAMES.includes(name.toLowerCase())) {
          badNames.push(name);
        }
      }
      if (ts.isParameter(node) && ts.isIdentifier(node.name)) {
        const name = node.name.text;
        if (this.GENERIC_NAMES.includes(name.toLowerCase())) {
          badNames.push(name);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (badNames.length > 3) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Uso de nomes genéricos: ${[...new Set(badNames)].slice(0, 3).join(", ")}.`,
        violation: "Nome de variável genérico",
        suggestion: "Use nomes descritivos que revelem a intenção da variável.",
        category: this.category,
      });
    }
  }

  private checkNestedIfs(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    const visit = (node: ts.Node, depth: number) => {
      if (ts.isIfStatement(node)) {
        if (depth > this.MAX_IF_DEPTH) {
          results.push({
            file,
            status: "WARN",
            severity: "MEDIUM",
            message: `If aninhado com profundidade ${depth}.`,
            violation: "If aninhado profundo",
            suggestion:
              "Use 'Guard Clauses' ou extraia para funções auxiliares.",
            category: this.category,
          });
          return; // report only once per tree
        }
        ts.forEachChild(node, (child) => visit(child, depth + 1));
      } else {
        ts.forEachChild(node, (child) => visit(child, depth));
      }
    };
    visit(sourceFile, 1);
  }

  private checkCommentedCode(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    // Procura por blocos de comentários que contenham syntax de código como ;, {, }, function, const
    const commentPattern = /\/\/\s*.*[;{}]|\/\*[\s\S]*?[;{}]*[\s\S]*?\*\//g;
    const matches = content.match(commentPattern);

    if (matches && matches.length > 3) {
      // Filtra falsos positivos como JSDoc
      const filtered = matches.filter(
        (m) =>
          !m.includes("@param") &&
          !m.includes("@returns") &&
          !m.includes("@type"),
      );
      if (filtered.length > 2) {
        results.push({
          file,
          status: "WARN",
          severity: "LOW",
          message: "Possível código comentado detectado.",
          violation: "Código comentado",
          suggestion: "Remova código morto. O Git já mantém o histórico.",
          category: this.category,
        });
      }
    }
  }
}
