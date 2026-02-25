import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

/**
 * Detecta violações SOLID avançadas:
 * - Open/Closed Principle (switch excessivo)
 * - Dependency Inversion (new direto em services)
 * - Interface Segregation (interfaces grandes)
 * - Tight Coupling (dependências concretas)
 */
export class SOLIDViolationsRule implements AuditRule {
  name = "SOLID Violations";
  category = "Architecture";

  execute(
    file: string,
    sourceFile: ts.SourceFile,
    content: string,
  ): AuditResult[] {
    const results: AuditResult[] = [];

    // 1. Open/Closed Principle - Switch excessivo
    this.checkExcessiveSwitch(file, sourceFile, results);

    // 2. Dependency Inversion - 'new' direto de serviços/repos em classes de aplicação
    this.checkConcreteDependency(file, sourceFile, content, results);

    // 3. Tight Coupling - import de camada errada
    this.checkTightCoupling(file, content, results);

    // 4. Interface Segregation - interfaces muito grandes
    this.checkLargeInterfaces(file, sourceFile, results);

    return results;
  }

  private checkExcessiveSwitch(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    const MAX_SWITCH_CASES = 6;

    const visit = (node: ts.Node) => {
      if (ts.isSwitchStatement(node)) {
        const caseCount = node.caseBlock.clauses.length;
        if (caseCount > MAX_SWITCH_CASES) {
          results.push({
            file,
            status: "WARN",
            severity: "MEDIUM",
            message: `Switch com ${caseCount} cases. Viola Open/Closed Principle.`,
            violation: "Switch Excessivo (OCP)",
            suggestion:
              "Substitua por Strategy Pattern, Map de funções, ou polimorfismo.",
            category: this.category,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  private checkConcreteDependency(
    file: string,
    sourceFile: ts.SourceFile,
    content: string,
    results: AuditResult[],
  ): void {
    // Verificar se um service/application instancia diretamente outro service/repository
    if (!file.includes("service") && !file.includes("application")) return;
    if (
      file.includes("route.ts") ||
      file.includes(".test.") ||
      file.includes(".spec.")
    )
      return;

    const newExpressions: string[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isNewExpression(node)) {
        const text = node.expression.getText(sourceFile);
        // Procurar instanciação de services/repositories dentro de services
        if (
          (text.includes("Service") || text.includes("Repository")) &&
          !text.includes("Error")
        ) {
          // Verificar se está no construtor (aceitável para composição raiz)
          let parent = node.parent;
          let inConstructor = false;
          while (parent) {
            if (ts.isConstructorDeclaration(parent)) {
              inConstructor = true;
              break;
            }
            parent = parent.parent;
          }

          if (!inConstructor) {
            newExpressions.push(text);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (newExpressions.length > 0) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Instanciação direta de dependência: ${newExpressions.slice(0, 3).join(", ")}.`,
        violation: "Dependency Inversion Violation",
        suggestion:
          "Injete dependências via construtor seguindo DIP. Use interfaces para desacoplar.",
        category: this.category,
      });
    }
  }

  private checkTightCoupling(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    // Detectar domínio importando infraestrutura
    if (file.includes("/domain/")) {
      const infraImports = [
        /import\s+.*from\s+['"].*\/infrastructure\//g,
        /import\s+.*from\s+['"].*prisma/g,
        /import\s+.*from\s+['"]@prisma/g,
      ];

      for (const pattern of infraImports) {
        if (pattern.test(content)) {
          results.push({
            file,
            status: "FAIL",
            severity: "HIGH",
            message: "Domínio importando diretamente da infraestrutura.",
            violation: "Violação de Boundary (DDD)",
            suggestion:
              "Domínio NUNCA deve conhecer infraestrutura. Use interfaces/ports no domínio.",
            category: this.category,
          });
          break;
        }
      }
    }

    // Detectar domínio importando framework
    if (file.includes("/domain/")) {
      const frameworkImports = [
        /import\s+.*from\s+['"]next/g,
        /import\s+.*from\s+['"]express/g,
        /import\s+.*from\s+['"]react/g,
      ];

      for (const pattern of frameworkImports) {
        if (pattern.test(content)) {
          results.push({
            file,
            status: "FAIL",
            severity: "HIGH",
            message: "Domínio depende de framework externo.",
            violation: "Domínio Dependente de Framework",
            suggestion:
              "O domínio deve ser agnóstico de framework. Use ports/adapters.",
            category: this.category,
          });
          break;
        }
      }
    }
  }

  private checkLargeInterfaces(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    const MAX_INTERFACE_MEMBERS = 15;

    const visit = (node: ts.Node) => {
      if (ts.isInterfaceDeclaration(node)) {
        const memberCount = node.members.length;
        if (memberCount > MAX_INTERFACE_MEMBERS) {
          const name = node.name.getText(sourceFile);
          results.push({
            file,
            status: "WARN",
            severity: "MEDIUM",
            message: `Interface '${name}' com ${memberCount} membros. Viola Interface Segregation.`,
            violation: "Interface Segregation Violation",
            suggestion: "Divida em interfaces menores e mais focadas (ISP).",
            category: this.category,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }
}
