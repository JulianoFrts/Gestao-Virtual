import * as ts from "typescript";
import { logger } from "@/lib/utils/logger";
import * as fs from "fs";
import * as path from "path";
import { GovernanceService } from "./governance.service";
import { AuditRule, AuditResult } from "../domain/rules/audit-rule.interface";
import { LongMethodRule } from "../domain/rules/long-method.rule";
import { SingleResponsibilityRule } from "../domain/rules/srp.rule";
import { MagicNumbersRule } from "../domain/rules/magic-numbers.rule";
import { AuditConfigService } from "../infrastructure/config/audit-config.service";
import { GitDiffService } from "../infrastructure/git/git-diff.service";
import { HashCacheService } from "../infrastructure/cache/hash-cache.service";
import { AuditScanner } from "./audit-scanner";
import { AuditReportService, AuditSummary } from "./audit-report.service";
import { CONSTANTS } from "@/lib/constants";

/**
 * ArchitecturalAuditor - Realiza auditoria estática do código
 * v3.1: SRP Refactoring & Constant Cleanup
 */
export class ArchitecturalAuditor {
  private readonly srcPath: string;
  private readonly configService: AuditConfigService;
  private readonly gitService: GitDiffService;
  private readonly cacheService: HashCacheService;
  private readonly scanner: AuditScanner;
  private readonly reportService: AuditReportService;

  private rules: AuditRule[] = [];

  constructor(
    private readonly governanceService: GovernanceService,
    basePath?: string
  ) {
    this.srcPath = this.resolveSafePath(basePath);

    this.configService = new AuditConfigService();
    this.gitService = new GitDiffService();
    this.cacheService = new HashCacheService();
    this.scanner = new AuditScanner(this.srcPath, this.configService, this.gitService);
    this.reportService = new AuditReportService();

    this.registerRules();
  }

  private registerRules() {
    // Mapa de regras disponíveis
    const availableRules = [
      new SingleResponsibilityRule(),
      new LongMethodRule(),
      new MagicNumbersRule()
    ];

    this.rules = availableRules;
  }

  private resolveSafePath(basePath?: string): string {
    const root = process.cwd();
    const resolved = path.resolve(basePath || path.join(root, "src"));

    if (!resolved.startsWith(root)) {
      logger.warn(`Tentativa de Path Traversal detectada: ${basePath}`);
      return path.join(root, "src");
    }

    logger.debug(`Raiz do projeto (raiz): ${root}`);
    logger.debug(`Caminho resolvido para auditoria: ${resolved}`);

    return resolved;
  }

  /**
   * Executa a auditoria completa (Full Scan ou Incremental)
   */
  public async runFullAudit(
    userId?: string,
    incremental: boolean = false,
    onProgress?: (result: AuditResult) => void
  ): Promise<{ results: AuditResult[]; summary: AuditSummary }> {
    logger.info(`Iniciando Auditoria Arquitetural de Sistema (v3.1) [Incremental: ${incremental}]`, {
      source: "Auditoria/AuditorArquitetural",
      userId,
    });

    const results: AuditResult[] = [];
    const files = await this.scanner.getFilesToAudit(incremental);

    if (files.length === 0 && incremental) {
      logger.info("Nenhuma alteração detectada via Git. Auditoria Completa.");
      return { results: [], summary: this.reportService.generateEmptyReport(0) };
    }

    // Processamento Principal
    const activeViolations = await this.performAuditScanParallel(
      files,
      results,
      userId,
      onProgress
    );

    // Reconciliação
    if (!incremental) {
      await this.reconcileResolvedIssues(activeViolations);
    }

    this.reportResults(results);

    const summary = this.reportService.calculateHealthScore(results, files.length);

    return { results, summary };
  }

  private async performAuditScanParallel(
    files: string[],
    results: AuditResult[],
    userId?: string,
    onProgress?: (result: AuditResult) => void
  ): Promise<Set<string>> {
    const activeViolations = new Set<string>();
    const CONCURRENCY_LIMIT = 10;

    const processBatch = async (batch: string[]) => {
      const promises = batch.map(async (file) => {
        try {
          const fileResults = await this.withTimeout(
            this.processFile(file),
            CONSTANTS.API.TIMEOUTS.DEFAULT / 10 // 3 segundos per file as before
          );

          if (fileResults.length > 0) {
            results.push(...fileResults);

            for (const res of fileResults) {
              const violationKey = `${res.file}:${res.violation}`;
              activeViolations.add(violationKey);
              await this.persistViolation(res, userId);

              if (onProgress) {
                onProgress(res);
              }
            }
          }
        } catch (error: any) {
          const errMsg = error instanceof Error ? error.message : String(error);
          logger.warn(`Erro/Timeout ao processar arquivo: ${file}`, { error: errMsg });
        }
      });
      await Promise.all(promises);
    };

    for (let i = 0; i < files.length; i += CONCURRENCY_LIMIT) {
      const batch = files.slice(i, i + CONCURRENCY_LIMIT);
      await processBatch(batch);
    }

    return activeViolations;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const timeout = new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("Tempo limite de processamento excedido")), ms)
    );
    return Promise.race([promise, timeout]);
  }

  private async persistViolation(res: AuditResult, userId?: string) {
    try {
      const sanitizedMessage = this.sanitize(res.message);
      const existing = await this.governanceService.findOpenViolation(
        res.file,
        res.violation || "Desconhecida"
      );

      if (existing) {
        await this.governanceService.updateViolation(existing.id, {
          lastDetectedAt: new Date(),
          performerId: userId || existing.performerId,
          message: sanitizedMessage,
        });
      } else {
        await this.governanceService.createViolation({
          file: res.file,
          violation: res.violation || "Desconhecida",
          message: sanitizedMessage,
          severity: res.severity || "LOW",
          suggestion: res.suggestion,
          status: "OPEN",
          performerId: userId,
        });
      }
    } catch (error) {
      logger.error("Erro ao persistir violação de auditoria", {
        error,
        file: res.file,
      });
    }
  }

  private sanitize(input?: string): string {
    return (input || "").slice(0, 1000);
  }

  private async reconcileResolvedIssues(activeViolations: Set<string>) {
    try {
      const openViolations = await this.governanceService.findOpenViolations();

      for (const violation of openViolations) {
        const dbKey = `${violation.file}:${violation.violation}`;

        if (!activeViolations.has(dbKey)) {
          await this.governanceService.updateViolation(violation.id, {
            status: "RESOLVED",
            resolvedAt: new Date(),
          });
          logger.info(
            `Violação resolvida detectada: ${violation.file} [${violation.violation}]`
          );
        }
      }
    } catch (error) {
      logger.error("Erro na reconciliação de auditoria", { error });
    }
  }

  private async processFile(file: string): Promise<AuditResult[]> {
    const content = await fs.promises.readFile(file, "utf8");

    if (!this.cacheService.shouldAudit(file, content)) {
      return [];
    }

    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const results: AuditResult[] = [];

    this.analyzeWithAST(relativePath, content, results);
    this.auditHardcodedStrings(relativePath, content, results);
    this.auditPrimitiveObsession(relativePath, content, results);
    this.auditVisualConsistency(relativePath, content, results);

    this.cacheService.updateCache(file, content, results.length);

    return results;
  }

  private analyzeWithAST(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    try {
      const sourceFile = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      for (const rule of this.rules) {
        const ruleResults = rule.execute(file, sourceFile, content);
        results.push(...ruleResults);
      }

      const visit = (node: ts.Node) => {
        if (
          ts.isFunctionDeclaration(node) ||
          ts.isMethodDeclaration(node) ||
          ts.isArrowFunction(node) ||
          ts.isFunctionExpression(node)
        ) {
          this.checkTooManyParameters(file, node, results);
        }

        if (
          ts.isCallExpression(node) &&
          ts.isPropertyAccessExpression(node.expression)
        ) {
          this.checkDDDViolations(file, node, results);
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    } catch (e) {
      logger.warn(`Erro na análise AST de ${file}`, { error: e });
    }
  }

  private checkTooManyParameters(
    file: string,
    node: ts.FunctionLikeDeclaration,
    results: AuditResult[]
  ) {
    const MAX_PARAMS = 5;
    if (node.parameters.length > MAX_PARAMS) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Função com ${node.parameters.length} parâmetros.`,
        violation: "Muitos Parâmetros",
        suggestion: "Use um objeto de configuração (DTO/Interface).",
      });
    }
  }

  private checkDDDViolations(
    file: string,
    node: ts.CallExpression,
    results: AuditResult[]
  ) {
    if (!file.includes("route.ts") && !file.includes("controller")) return;

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

  private auditHardcodedStrings(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    const APP_URL = process.env.APP_URL || "https://orion.gestaovirtual.com";

    if (
      content.includes("localhost:") &&
      !file.includes("config") &&
      !file.includes("client") &&
      !file.includes("AuditScanner") // Scanner and Auditor are exceptions while refactoring
    ) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: "URL localhost hardcoded.",
        violation: "Ambiente Hardcoded",
        suggestion: `Use variáveis de ambiente (APP_URL=${APP_URL}).`,
      });
    }
  }

  private auditPrimitiveObsession(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    const MAX_PRIMITIVE_STATES = 5;
    const statePattern =
      /(?:status|type|state|mode)\s*(?:===?|!==?)\s*['"]\w+['"]/gi;
    const matches = content.match(statePattern) || [];

    if (matches.length > MAX_PRIMITIVE_STATES) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Uso excessivo de estados string (${matches.length}x).`,
        violation: "Obsessão por Primitivos",
        suggestion: "Use Enums ou Tipos.",
      });
    }
  }

  private auditVisualConsistency(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    if (!file.endsWith(".tsx")) return;
    if (file.includes("index.css") || file.includes("tailwind.config")) return;

    const MAX_COLOR_VIOLATIONS = 5;
    const problematicColorsPattern =
      /(?:text|bg|border|ring|shadow)-(?:orange|amber)-(?:400|500|600|700)/g;
    const matches = content.match(problematicColorsPattern) || [];
    const uniqueColors = [...new Set(matches)];

    if (uniqueColors.length > 0 && matches.length > MAX_COLOR_VIOLATIONS) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Cores fora do padrão: ${uniqueColors.join(", ")}.`,
        violation: "Inconsistência Visual",
        suggestion: "Use variáveis de tema (primary/secondary).",
      });
    }
  }

  private reportResults(results: AuditResult[]) {
    const fails = results.filter((r) => r.status === "FAIL").length;
    const warns = results.filter((r) => r.status === "WARN").length;

    if (fails > 0 || warns > 0) {
      logger.warn(
        `Auditoria (v3.1): ${fails} Falhas, ${warns} Alertas, ${results.length} Total.`,
        { source: "Audit/ArchitecturalAuditor" }
      );
    } else {
      logger.success("Auditoria (v3.1): 100% de conformidade.", {
        source: "Audit/ArchitecturalAuditor",
      });
    }
  }
}
