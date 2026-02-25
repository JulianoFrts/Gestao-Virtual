import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

/**
 * Detecta problemas de tipagem TypeScript: any, non-null assertion, casts inseguros
 * Severidade: MEDIUM — risco de manutenibilidade e segurança de tipos
 */
export class TypeSafetyRule implements AuditRule {
  name = "Type Safety";
  category = "TypeScript";

  private readonly MAX_ANY_USAGE = 3;
  private readonly MAX_NON_NULL_ASSERTIONS = 3;

  execute(
    file: string,
    sourceFile: ts.SourceFile,
    content: string,
  ): AuditResult[] {
    if (
      file.includes(".test.") ||
      file.includes(".spec.") ||
      file.includes(".d.ts")
    )
      return [];

    const results: AuditResult[] = [];

    // 1. Uso excessivo de `any`
    this.checkAnyUsage(file, sourceFile, results);

    // 2. Uso de non-null assertion `!`
    this.checkNonNullAssertions(file, sourceFile, results);

    // 3. Uso de `as unknown as` (double cast inseguro)
    this.checkDoubleCast(file, content, results);

    // 4. Retorno implícito de `any`
    this.checkImplicitAnyReturn(file, sourceFile, results);

    // 5. Falta de tipagem em funções públicas
    this.checkMissingPublicReturnTypes(file, sourceFile, results);

    return results;
  }

  private checkAnyUsage(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    let anyCount = 0;

    const visit = (node: ts.Node) => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) {
        anyCount++;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (anyCount > this.MAX_ANY_USAGE) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Uso excessivo de 'any' (${anyCount}x). Fragiliza o type system.`,
        violation: "Uso Excessivo de any",
        suggestion: `Substitua 'any' por tipos explícitos, Record<string, unknown>, ou generics.`,
        category: this.category,
      });
    }
  }

  private checkNonNullAssertions(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    let assertionCount = 0;

    const visit = (node: ts.Node) => {
      if (ts.isNonNullExpression(node)) {
        assertionCount++;
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (assertionCount > this.MAX_NON_NULL_ASSERTIONS) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Uso excessivo de non-null assertion '!' (${assertionCount}x).`,
        violation: "Non-Null Assertion Excessivo",
        suggestion:
          "Use optional chaining (?.) ou type guards ao invés de '!'.",
        category: this.category,
      });
    }
  }

  private checkDoubleCast(
    file: string,
    content: string,
    results: AuditResult[],
  ): void {
    const doublecastPattern = /as\s+unknown\s+as\s+/g;
    const matches = content.match(doublecastPattern);

    if (matches && matches.length > 0) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Double cast inseguro 'as unknown as' detectado (${matches.length}x).`,
        violation: "Cast Inseguro (as unknown as)",
        suggestion:
          "Corrija a tipagem na origem ao invés de forçar casts duplos.",
        category: this.category,
      });
    }
  }

  private checkImplicitAnyReturn(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    let implicitCount = 0;

    const visit = (node: ts.Node) => {
      if (
        (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) &&
        node.name &&
        !node.type // sem tipo de retorno explícito
      ) {
        const name = node.name.getText(sourceFile);
        // Ignorar lifecycle methods e callbacks comuns
        if (
          !["constructor", "render", "componentDidMount", "ngOnInit"].includes(
            name,
          )
        ) {
          implicitCount++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (implicitCount > 2) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `${implicitCount} funções/métodos sem tipo de retorno explícito.`,
        violation: "Falta de Tipagem Explícita",
        suggestion:
          "Adicione tipos de retorno (: void, : Promise<T>, etc.) para melhor documentação e segurança.",
        category: this.category,
      });
    }
  }

  private checkMissingPublicReturnTypes(
    file: string,
    sourceFile: ts.SourceFile,
    results: AuditResult[],
  ): void {
    let missing = 0;

    const visit = (node: ts.Node) => {
      if (ts.isMethodDeclaration(node) && node.name) {
        const modifiers = ts.getModifiers(node);
        const isPublic =
          !modifiers ||
          modifiers.some((m) => m.kind === ts.SyntaxKind.PublicKeyword) ||
          !modifiers.some(
            (m) =>
              m.kind === ts.SyntaxKind.PrivateKeyword ||
              m.kind === ts.SyntaxKind.ProtectedKeyword,
          );

        if (isPublic && !node.type) {
          missing++;
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);

    if (missing > 3) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `${missing} métodos públicos sem tipo de retorno.`,
        violation: "Método Público sem Tipagem",
        suggestion:
          "Sempre tipar retorno de métodos públicos para garantir contratos claros.",
        category: this.category,
      });
    }
  }
}
