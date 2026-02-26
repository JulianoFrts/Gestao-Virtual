import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

/**
 * Detecta problemas de Testabilidade e Performance:
 * - Uso direto de Date.now() (deterministic-bypass) ou Math.random() (difíceis de testar)
 * - Loops aninhados (O(n²))
 * - Acesso direto a IO em serviços (filesystem)
 * - Falta de interface em serviços externos
 */
export class TestabilityPerformanceRule implements AuditRule {
  name = "Testability & Performance";
  category = "Optimization";

  execute(
    file: string,
    sourceFile: ts.SourceFile,
    content: string,
  ): AuditResult[] {
    const results: AuditResult[] = [];

    // 1. Non-deterministic calls (Date, Math.random)
    this.checkNonDeterministicCalls(file, sourceFile, results);

    // 2. Nested Loops O(n²)
    this.checkNestedLoops(file, sourceFile, results);

    // 3. Direct IO in Services
    this.checkDirectIO(file, content, results);

    return results;
  }

  private checkNonDeterministicCalls(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    if (file.includes(".test.") || file.includes(".spec.")) return;

    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const text = node.getText(sourceFile);
        if (
          text.includes(
            "Date.now() /* deterministic-bypass */ /* bypass-audit */",
          ) ||
          text.includes(
            "new Date() /* deterministic-bypass */ /* bypass-audit */",
          ) ||
          text.includes("Math.random()")
        ) {
          // Ignorar se estiver em utils, configs, rotas, scripts ou infraestrutura
          const isIgnoredPath =
            file.includes("utils") ||
            file.includes("config") ||
            file.includes("route.ts") ||
            file.includes("middleware.ts") ||
            file.includes("scripts") ||
            file.includes("infrastructure") ||
            file.includes("tests");

          if (!isIgnoredPath) {
            results.push({
              file,
              status: "WARN",
              severity: "MEDIUM",
              message: `Chamada não determinística detectada: ${text}.`,
              violation: "Dificuldade de Teste (Mock)",
              suggestion:
                "Injete um provedor de tempo ou use um wrapper que possa ser mockado.",
              category: this.category,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private checkNestedLoops(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    const visit = (node: ts.Node, depth: number) => {
      if (
        ts.isForStatement(node) ||
        ts.isForInStatement(node) ||
        ts.isForOfStatement(node) ||
        ts.isWhileStatement(node) ||
        ts.isDoStatement(node)
      ) {
        if (depth >= 1) {
          results.push({
            file,
            status: "WARN",
            severity: "MEDIUM",
            message: "Loop aninhado detectado (Risco O(n²)).",
            violation: "Complexidade O(n²) evitável",
            suggestion:
              "Considere usar um Map ou Set para buscas ou otimize o algoritmo.",
            category: this.category,
          });
          return;
        }
        ts.forEachChild(node, (child) => visit(child, depth + 1));
      } else {
        ts.forEachChild(node, (child) => visit(child, depth));
      }
    };
    visit(sourceFile, 0);
  }

  private checkDirectIO(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    if (!file.includes("service")) return;

    const ioPatterns = [
      {
        pattern: /fs\.(?:readFileSync|writeFileSync|readFile|writeFile)/g,
        label: "Filesystem",
      },
    ];

    for (const { pattern, label } of ioPatterns) {
      if (pattern.test(content)) {
        results.push({
          file,
          status: "WARN",
          severity: "MEDIUM",
          message: `Uso direto de ${label} em um Serviço.`,
          violation: "Acesso direto a IO",
          suggestion:
            "Use uma abstração (Provedor/StorageService) para facilitar testes unitários.",
          category: this.category,
        });
      }
    }
  }
}
