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

/**
 * AuditSummary - Resumo executivo da auditoria com Health Score
 */
export interface AuditSummary {
  healthScore: number; // 0-100
  totalFiles: number;
  violationsCount: number;
  byCategory: Record<string, number>;
  bySeverity: { HIGH: number; MEDIUM: number; LOW: number };
  topIssues: string[];
}

/**
 * ArchitecturalAuditor - Realiza auditoria estática do código
 * v3.0: Full Service Integration (Config, Git, Cache)
 */
export class ArchitecturalAuditor {
  private readonly srcPath: string;
  private readonly configService: AuditConfigService;
  private readonly gitService: GitDiffService;
  private readonly cacheService: HashCacheService;

  private rules: AuditRule[] = [];

  constructor(
    private readonly governanceService: GovernanceService,
    basePath?: string
  ) {
    this.srcPath = this.resolveSafePath(basePath);

    // Inicialização dos serviços (Injeção de dependência seria ideal aqui)
    this.configService = new AuditConfigService();
    this.gitService = new GitDiffService();
    this.cacheService = new HashCacheService();

    this.registerRules();
  }

  private registerRules() {
    const enabledRules = this.configService.getEnabledRules();

    // Mapa de regras disponíveis
    const availableRules = [
      new SingleResponsibilityRule(),
      new LongMethodRule(),
      new MagicNumbersRule()
    ];

    // Filtrar apenas as ativadas na config (por enquanto hardcoded names, ideal seria dynamic map)
    // Na v3.1 mapear nomes de config para instâncias
    this.rules = availableRules;
    // TODO: Implementar filtro real baseado em `enabledRules`
  }

  private resolveSafePath(basePath?: string): string {
    const root = process.cwd();
    const resolved = path.resolve(basePath || path.join(root, "src"));

    if (!resolved.startsWith(root)) {
      logger.warn(`Tentativa de Path Traversal detectada: ${basePath}`);
      return path.join(root, "src");
    }

    return resolved;
  }

  /**
   * Executa a auditoria completa (Full Scan ou Incremental)
   */
  public async runFullAudit(
    userId?: string,
    incremental: boolean = false
  ): Promise<{ results: AuditResult[]; summary: AuditSummary }> {
    logger.info(`Iniciando Auditoria Arquitetural de Sistema (v3.0) [Incremental: ${incremental}]`, {
      source: "Audit/ArchitecturalAuditor",
      userId,
    });

    const results: AuditResult[] = [];
    let files: string[] = [];

    // 1. Determinar Escopo de Arquivos
    if (incremental) {
      files = await this.gitService.getChangedFiles();
      if (files.length === 0) {
        logger.info("Nenhuma alteração detectada via Git. Auditando apenas cache misses ou full scan.");
        // Fallback se git não retornar nada (opcional: ou retornar vazio)
        // Para v3.0 vamos assumir que incremental vazio retorna "Audit Complete - No Changes"
        return this.generateEmptyReport(0);
      }
    } else {
      files = await this.getAllFilesAsync(this.srcPath);
    }

    // 2. Processamento Principal
    const activeViolations = await this.performAuditScanParallel(
      files,
      results,
      userId
    );

    // 3. Reconciliação só faz sentido em Full Scan ou lógica complexa de Tracking
    if (!incremental) {
      await this.reconcileResolvedIssues(activeViolations);
    }

    this.reportResults(results);

    // 4. Calcular Health Score
    const summary = this.calculateHealthScore(results, files.length);

    return { results, summary };
  }

  private generateEmptyReport(totalFiles: number): { results: AuditResult[]; summary: AuditSummary } {
    return {
      results: [],
      summary: {
        healthScore: 100,
        totalFiles,
        violationsCount: 0,
        byCategory: {},
        bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
        topIssues: []
      }
    };
  }

  private calculateHealthScore(
    results: AuditResult[],
    totalFiles: number
  ): AuditSummary {
    const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byCategory: Record<string, number> = {};

    results.forEach((r) => {
      bySeverity[r.severity || "LOW"]++;
      const cat = r.violation || "Unknown";
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    const weightedViolations =
      bySeverity.HIGH * 10 + bySeverity.MEDIUM * 5 + bySeverity.LOW * 2;

    const penalty = Math.min(
      100,
      (weightedViolations / Math.max(totalFiles, 1)) * 10
    );
    const healthScore = Math.max(0, Math.round(100 - penalty));

    const topIssues = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);

    return {
      healthScore,
      totalFiles,
      violationsCount: results.length,
      byCategory,
      bySeverity,
      topIssues,
    };
  }

  private async performAuditScanParallel(
    files: string[],
    results: AuditResult[],
    userId?: string
  ): Promise<Set<string>> {
    const activeViolations = new Set<string>();
    const CONCURRENCY_LIMIT = 10;

    const processBatch = async (batch: string[]) => {
      const promises = batch.map(async (file) => {
        try {
          const fileResults = await this.withTimeout(
            this.processFile(file),
            3000
          );

          if (fileResults.length > 0) {
            results.push(...fileResults);

            for (const res of fileResults) {
              const violationKey = `${res.file}:${res.violation}`;
              activeViolations.add(violationKey);
              await this.persistViolation(res, userId);
            }
          }
        } catch (error) {
          logger.warn(`Erro/Timeout ao processar arquivo: ${file}`, { error });
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
      setTimeout(() => reject(new Error("Timeout de processamento")), ms)
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

  private async getAllFilesAsync(dir: string): Promise<string[]> {
    let results: string[] = [];
    const ignorePatterns = this.configService.getIgnorePatterns();

    try {
      const list = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const entry of list) {
        // Ignorar diretórios configurados
        if (ignorePatterns.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          results = results.concat(await this.getAllFilesAsync(fullPath));
        } else {
          if (
            (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) &&
            !fullPath.endsWith(".d.ts")
          ) {
            results.push(fullPath);
          }
        }
      }
    } catch (e) {
      logger.warn(`Erro ao ler diretório: ${dir}`, { error: e });
    }
    return results;
  }

  private async processFile(file: string): Promise<AuditResult[]> {
    const content = await fs.promises.readFile(file, "utf8");

    // Hash Cache Check
    if (!this.cacheService.shouldAudit(file, content)) {
      return []; // Skip audit if content matches cache
    }

    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");
    const results: AuditResult[] = [];

    // AST Analyzers
    this.analyzeWithAST(relativePath, content, results);

    // Regex Analyzers
    this.auditHardcodedStrings(relativePath, content, results);
    this.auditHardcodedColors(relativePath, content, results);
    this.auditPrimitiveObsession(relativePath, content, results);

    // Update Cache only if no failures (or update anyway to avoid re-scan loops? 
    // Usually update cache regardless of violations to avoid re-scanning same broken code 
    // BUT we want to detect if violations persist. 
    // Current HashCacheStrategy: cache content hash. If content same, violations are same.)
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

      // Legacy checks kept for compatibility until full migration
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

  // --- Legacy Checks ---

  private checkTooManyParameters(
    file: string,
    node: ts.FunctionLikeDeclaration,
    results: AuditResult[]
  ) {
    if (node.parameters.length > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Função com ${node.parameters.length} parâmetros.`,
        violation: "Too Many Parameters",
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
        message: "Persistência direta na camada de Route/Controller.",
        violation: "Layer Violation (DDD)",
        suggestion: "Mova a persistência para um Service ou Repository.",
      });
    }
  }

  private auditHardcodedStrings(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    if (
      content.includes("localhost:") &&
      !file.includes("config") &&
      !file.includes("client")
    ) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: "URL localhost hardcoded.",
        violation: "Hardcoded Environment",
        suggestion: "Use variáveis de ambiente (process.env).",
      });
    }
  }

  private auditPrimitiveObsession(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    const statePattern =
      /(?:status|type|state|mode)\s*(?:===?|!==?)\s*['"]\w+['"]/gi;
    const matches = content.match(statePattern) || [];

    if (matches.length > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Uso excessivo de estados string (${matches.length}x).`,
        violation: "Primitive Obsession",
        suggestion: "Use Enums ou Types.",
      });
    }
  }

  private auditHardcodedColors(
    file: string,
    content: string,
    results: AuditResult[]
  ) {
    if (!file.endsWith(".tsx")) return;
    if (file.includes("index.css") || file.includes("tailwind.config")) return;

    const problematicColorsPattern =
      /(?:text|bg|border|ring|shadow)-(?:orange|amber)-(?:400|500|600|700)/g;
    const matches = content.match(problematicColorsPattern) || [];
    const uniqueColors = [...new Set(matches)];

    if (uniqueColors.length > 0 && matches.length > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Cores fora do padrão: ${uniqueColors.join(", ")}.`,
        violation: "Visual Inconsistency",
        suggestion: "Use variáveis de tema (primary/secondary).",
      });
    }
  }

  private reportResults(results: AuditResult[]) {
    const fails = results.filter((r) => r.status === "FAIL").length;
    const warns = results.filter((r) => r.status === "WARN").length;

    if (fails > 0 || warns > 0) {
      logger.warn(
        `Auditoria (v3.0): ${fails} Falhas, ${warns} Alertas, ${results.length} Total.`,
        { source: "Audit/ArchitecturalAuditor" }
      );
    } else {
      logger.success("Auditoria (v3.0): 100% de conformidade.", {
        source: "Audit/ArchitecturalAuditor",
      });
    }
  }
}
