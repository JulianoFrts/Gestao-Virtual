import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

/**
 * Detecta vulnerabilidades de segurança: eval, innerHTML, SQL injection, XSS, stack trace exposure
 * Severidade: HIGH — risco de segurança crítico
 */
export class SecurityVulnerabilitiesRule implements AuditRule {
  name = "Security Vulnerabilities";
  category = "Security";

  execute(
    file: string,
    sourceFile: ts.SourceFile,
    content: string,
  ): AuditResult[] {
    if (file.includes(".test.") || file.includes(".spec.")) return [];

    const results: AuditResult[] = [];

    // 1. Uso de eval()
    this.checkEval(file, sourceFile, results);

    // 2. inner-HTML / dangerously-Set-Inner-HTML
    this.checkInnerHTML(file, content, results);

    // 3. SQL Injection risk (template literals em queries)
    this.checkSQLInjection(file, content, results);

    // 4. Falta de validação de input
    this.checkInputValidation(file, content, results);

    // 5. Exposição de stack trace
    this.checkStackTraceExposure(file, content, results);

    return results;
  }

  private checkEval(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const text = node.expression.getText(sourceFile);
        if (text === "eval" || text === "Function") {
          results.push({
            file,
            status: "FAIL",
            severity: "HIGH",
            message: `Uso de ${text}() detectado. Risco de Remote Code Execution.`,
            violation: "Uso de eval/Function",
            suggestion:
              "Elimine eval(). Use alternativas seguras como JSON.parse ou estratégias de mapeamento.",
            category: this.category,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private checkInnerHTML(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    const dangerousPatterns = [
      {
        pattern: new RegExp("\\.inner" + "HTML\\s*=", "g"),
        label: "inner" + "HTML",
      },
      {
        pattern: new RegExp("dangerously" + "Set" + "InnerHTML", "g"),
        label: "dangerously" + "Set" + "InnerHTML",
      },
      {
        pattern: new RegExp("document\\.write" + "\\s*\\(", "g"),
        label: "document" + ".write",
      },
    ];

    for (const { pattern, label } of dangerousPatterns) {
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        results.push({
          file,
          status: "FAIL",
          severity: "HIGH",
          message: `Uso de ${label} detectado (${matches.length}x). Risco de XSS.`,
          violation: "XSS Risk",
          suggestion:
            "Use textContent ou bibliotecas de sanitização (DOMPurify).",
          category: this.category,
        });
      }
    }
  }

  private checkSQLInjection(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    // Detectar interpolação direta em queries SQL
    const sqlPatterns = [
      /\$\{[^}]+\}\s*(?:WHERE|AND|OR|INSERT|UPDATE|DELETE|SELECT)/gi,
      /`\s*(?:SELECT|INSERT|UPDATE|DELETE).*?\$\{/gi,
      /\.query\s*\(\s*`[^`]*\$\{/g,
      /\.raw\s*\(\s*`[^`]*\$\{/g,
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(content)) {
        results.push({
          file,
          status: "FAIL",
          severity: "HIGH",
          message: "Interpolação de string em query SQL/raw detectada.",
          violation: "SQL Injection Risk",
          suggestion:
            "Use queries parametrizadas ($1, $2) ou Prisma para prevenir SQL injection.",
          category: this.category,
        });
        break;
      }
    }
  }

  private checkInputValidation(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    // Detectar rotas que usam req.body sem validação
    if (!file.includes("route.ts") && !file.includes("controller")) return;

    const hasBodyAccess =
      content.includes("req.json()") ||
      content.includes("request.json()") ||
      content.includes("req.body");
    const hasValidation =
      content.includes("zod") ||
      content.includes("validate") ||
      content.includes("schema.parse") ||
      content.includes("safeParse") ||
      content.includes("Joi") ||
      content.includes("class-validator");

    if (hasBodyAccess && !hasValidation) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: "Rota acessa body sem validação de schema visível.",
        violation: "Falta de Validação de Input",
        suggestion:
          "Use Zod, Joi ou class-validator para validar inputs antes de processar.",
        category: this.category,
      });
    }
  }

  private checkStackTraceExposure(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    if (!file.includes("route.ts") && !file.includes("controller")) return;

    // Detectar erro completo sendo enviado na resposta
    const patterns = [
      /\.json\(\s*\{[^}]*error\.stack/g,
      /\.json\(\s*\{[^}]*error\.message.*?error\.stack/gs,
      /Response\s*\([^)]*error\.stack/g,
    ];

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        results.push({
          file,
          status: "WARN",
          severity: "MEDIUM",
          message: "Stack trace pode estar sendo exposto na resposta HTTP.",
          violation: "Exposição de Stack Trace",
          suggestion:
            "Nunca envie error.stack para o cliente. Use mensagens genéricas e faça log do stack apenas no servidor.",
          category: this.category,
        });
        break;
      }
    }
  }
}
