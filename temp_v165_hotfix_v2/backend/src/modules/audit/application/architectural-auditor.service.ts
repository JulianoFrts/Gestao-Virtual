import { logger } from "@/lib/utils/logger";
import * as fs from "fs";
import * as path from "path";
import { GovernanceService } from "./governance.service";

/**
 * AuditResult - Resultado de uma verificação arquitetural
 */
export interface AuditResult {
  file: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  violation?: string;
  suggestion?: string;
  severity?: "HIGH" | "MEDIUM" | "LOW";
  category?: string; // Categoria do Code Smell para agrupamento
}

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
 */
export class ArchitecturalAuditor {
  private readonly srcPath: string;

  constructor(
    private readonly governanceService: GovernanceService,
    basePath?: string
  ) {
    this.srcPath = basePath || path.join(process.cwd(), "src");
  }

  /**
   * Executa a auditoria completa e persiste no banco de dados
   */
  public async runFullAudit(userId?: string): Promise<{ results: AuditResult[]; summary: AuditSummary }> {
    logger.info("Iniciando Auditoria Arquitetural de Sistema", {
      source: "Audit/ArchitecturalAuditor",
      userId,
    });

    const results: AuditResult[] = [];
    const files = this.getAllFiles(this.srcPath);

    const activeViolations = await this.performAuditScan(
      files,
      results,
      userId,
    );

    // Lógica de Reconciliação: Marcar como RESOLVED o que não foi detectado neste scan
    await this.reconcileResolvedIssues(activeViolations);

    this.reportResults(results);

    // Calcular Health Score
    const summary = this.calculateHealthScore(results, files.length);

    return { results, summary };
  }

  /**
   * Calcula o Health Score de 0 a 100 baseado na densidade de violações.
   * Pontução: 100 - (violações ponderadas / total de arquivos) * fator
   */
  private calculateHealthScore(results: AuditResult[], totalFiles: number): AuditSummary {
    const bySeverity = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    const byCategory: Record<string, number> = {};

    results.forEach(r => {
      bySeverity[r.severity || 'LOW']++;
      const cat = r.violation || 'Unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    });

    // Peso: HIGH = 10, MEDIUM = 5, LOW = 2
    const weightedViolations = (bySeverity.HIGH * 10) + (bySeverity.MEDIUM * 5) + (bySeverity.LOW * 2);

    // Fórmula: 100 - (violações ponderadas / arquivos) * 10
    // Máximo de penalidade: 100 (não pode ser negativo)
    const penalty = Math.min(100, (weightedViolations / Math.max(totalFiles, 1)) * 10);
    const healthScore = Math.max(0, Math.round(100 - penalty));

    // Top Issues (as 5 categorias mais frequentes)
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

  private async performAuditScan(
    files: string[],
    results: AuditResult[],
    userId?: string,
  ): Promise<Set<string>> {
    const activeViolations = new Set<string>();

    for (const file of files) {
      const fileResults = await this.processFile(file);
      if (fileResults.length > 0) {
        results.push(...fileResults);

        // Persistir ou atualizar no banco de dados
        for (const res of fileResults) {
          const violationKey = `${res.file}:${res.violation}`;
          activeViolations.add(violationKey);
          await this.persistViolation(res, userId);
        }
      }
    }
    return activeViolations;
  }

  private async persistViolation(res: AuditResult, userId?: string) {
    try {
      const existing = await this.governanceService.findOpenViolation(
        res.file,
        res.violation || "Desconhecida",
      );

      if (existing) {
        await this.governanceService.updateViolation(existing.id, {
          lastDetectedAt: new Date(),
          performerId: userId || existing.performerId,
        });
      } else {
        await this.governanceService.createViolation({
          file: res.file,
          violation: res.violation || "Desconhecida",
          message: res.message,
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

  private async reconcileResolvedIssues(activeViolations: Set<string>) {
    try {
      // Buscar todas as violações OPEN
      const openViolations = await this.governanceService.findOpenViolations();

      for (const violation of openViolations) {
        // Generate the key for the existing database record
        const dbKey = `${violation.file}:${violation.violation}`;

        // Se a chave da violação NÃO está no conjunto de violações ativas deste scan,
        // significa que ESTA violação específica foi corrigida.
        if (!activeViolations.has(dbKey)) {
          await this.governanceService.updateViolation(violation.id, {
            status: "RESOLVED",
            resolvedAt: new Date(),
          });
          logger.info(
            `Violação resolvida detectada automaticamente: ${violation.file} [${violation.violation}]`,
          );
        }
      }
    } catch (error) {
      logger.error("Erro na reconciliação de auditoria", { error });
    }
  }

  private getAllFiles(dirPath: string, fileList: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const filePath = path.join(dirPath, file);
      if (fs.statSync(filePath).isDirectory()) {
        fileList = this.getAllFiles(filePath, fileList);
      } else {
        fileList.push(filePath);
      }
    });
    return fileList;
  }

  private auditTellDontAsk(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    const getterMatches = content.match(/\.get[A-Z][a-zA-Z]*\(\)/g) || [];
    if (
      getterMatches.length > 15 &&
      (content.includes("if (") || content.includes("forEach"))
    ) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: "Possível violação de Tell, Don't Ask detectada.",
        violation: "Uso excessivo de Getters para lógica externa.",
        suggestion:
          "Mova a lógica de decisão para dentro da entidade ou use um Domain Service.",
      });
    }
  }

  private auditSRP(file: string, content: string, results: AuditResult[]) {
    const lines = content.split("\n").length;
    // Thresholds profissionais: 400 = WARN, 600 = FAIL
    if (lines > 600) {
      results.push({
        file,
        status: "FAIL",
        severity: "HIGH",
        message: `Arquivo muito grande (${lines} linhas). Violação crítica de SRP.`,
        violation: "Single Responsibility Principle violation.",
        suggestion:
          "Este arquivo está fazendo coisas demais. Refatore em componentes ou hooks menores.",
      });
    } else if (lines > 400) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Arquivo grande (${lines} linhas). Valide se SRP está sendo seguido.`,
        violation: "Single Responsibility Principle warning.",
        suggestion:
          "Considere dividir este arquivo em módulos menores para facilitar manutenção.",
      });
    }
  }

  private auditDDDController(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    if (file.includes("route.ts") || file.includes("controller")) {
      if (
        content.includes("prisma.") &&
        (content.includes(".update({") || content.includes(".create({")) &&
        !file.includes("Audit")
      ) {
        results.push({
          file,
          status: "WARN",
          severity: "MEDIUM",
          message:
            "Persistência direta detectada na camada de transporte (Route/Controller).",
          violation: "Anemic Domain Model / Lack of encapsulation.",
          suggestion:
            "Encapsule essa lógica em um Service de aplicação ou Use Case para respeitar as camadas do DDD.",
        });
      }
    }
  }

  private auditLongMethods(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    const lines = content.split("\n");
    const blockStack: { start: number; isFunction: boolean }[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Heurística para detectar início de função/método
      // Procura por: async name(), function name(), name = () =>, name() { (method)
      const isFuncStart =
        /async\s+\w+\s*\(|function\s+\w+\s*\(|\w+\s*=\s*\([^)]*\)\s*=>|\w+\s*\([^)]*\)\s*\{/.test(
          trimmed,
        );
      const isClassStart = /class\s+\w+/.test(trimmed);

      if (line.includes("{")) {
        // Se estamos abrindo um bloco, empilhamos
        // Se for o início de uma classe, isFunction = false
        // Se for o início de uma função ou se estivermos dentro de uma classe e abrir um bloco (provável método)
        const isFunction = isFuncStart && !isClassStart;
        blockStack.push({ start: index, isFunction });
      }

      if (line.includes("}")) {
        const block = blockStack.pop();

        if (block && block.isFunction) {
          const duration = index - block.start;
          // Reportar se for maior que 60 linhas
          if (duration > 60) {
            results.push({
              file,
              status: "WARN",
              severity: "LOW",
              message: `Função/Método na linha ${block.start + 1} possui ${duration} linhas.`,
              violation: "Long Method",
              suggestion:
                "Extraia partes da lógica desta função para métodos auxiliares.",
            });
          }
        }
      }
    });
  }

  private auditHardcodedStrings(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    if (
      content.includes("localhost" + ":") &&
      !file.includes("config") &&
      !file.includes("client")
    ) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: "URL de ambiente (localhost) fixada no código.",
        violation: "Hardcoded Environment Variable",
        suggestion:
          "Use process.env.NEXT_PUBLIC_API_URL ou similar para evitar problemas em produção.",
      });
    }
  }

  /**
   * Too Many Parameters (Code Smell)
   * Funções com mais de 4 parâmetros indicam necessidade de refatoração.
   */
  private auditTooManyParameters(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    // Regex para capturar funções com parâmetros
    const funcPattern = /(?:function\s+\w+|\w+\s*=\s*(?:async\s*)?\([^)]*\)|(?:async\s+)?\w+\s*\()\s*\(([^)]*)\)/g;
    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const params = match[1]?.split(",").filter(p => p.trim().length > 0) || [];
      if (params.length > 5) {
        results.push({
          file,
          status: "WARN",
          severity: "MEDIUM",
          message: `Função com ${params.length} parâmetros detectada.`,
          violation: "Too Many Parameters",
          suggestion:
            "Agrupe parâmetros relacionados em um objeto ou crie uma interface de configuração.",
        });
      }
    }
  }

  /**
   * Deep Nesting (Code Smell)
   * Mais de 3 níveis de indentação indicam lógica complexa demais.
   */
  private auditDeepNesting(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    const lines = content.split("\n");
    let maxNesting = 0;
    let currentNesting = 0;
    let deepLine = 0;

    lines.forEach((line, idx) => {
      const opens = (line.match(/{/g) || []).length;
      const closes = (line.match(/}/g) || []).length;
      currentNesting += opens - closes;
      if (currentNesting > maxNesting) {
        maxNesting = currentNesting;
        deepLine = idx + 1;
      }
    });

    if (maxNesting > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "MEDIUM",
        message: `Aninhamento profundo detectado (${maxNesting} níveis) na linha ${deepLine}.`,
        violation: "Deep Nesting",
        suggestion:
          "Extraia blocos aninhados para funções auxiliares ou use early returns.",
      });
    }
  }

  /**
   * Magic Numbers (Code Smell)
   * Números fixos no código sem constantes nomeadas.
   */
  private auditMagicNumbers(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    // Ignora 0, 1, 2 (comuns e aceitáveis) e números em imports/exports
    const magicPattern = /(?<!\w)[3-9]\d{2,}(?!\w|px|em|rem|%|vh|vw|ms|s)/g;
    const matches = content.match(magicPattern) || [];
    const uniqueMagics = [...new Set(matches)];

    if (uniqueMagics.length > 3) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Detectados ${uniqueMagics.length} Magic Numbers: ${uniqueMagics.slice(0, 5).join(", ")}...`,
        violation: "Magic Numbers",
        suggestion:
          "Defina constantes nomeadas para esses valores (ex: const MAX_RETRIES = 3).",
      });
    }
  }

  /**
   * Primitive Obsession (Code Smell)
   * Uso excessivo de strings literais para estados onde enums seriam melhores.
   */
  private auditPrimitiveObsession(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    // Detecta strings repetidas como estados
    const statePattern = /(?:status|type|state|mode)\s*(?:===?|!==?)\s*['"]\w+['"]/gi;
    const matches = content.match(statePattern) || [];

    if (matches.length > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Detectados ${matches.length} comparações de estado com strings literais.`,
        violation: "Primitive Obsession",
        suggestion:
          "Use enums ou union types para estados (ex: type Status = 'OPEN' | 'CLOSED').",
      });
    }
  }

  /**
   * Hardcoded Colors (Visual Consistency)
   * Detecta cores hardcoded (orange, amber, etc) em arquivos TSX que deveriam usar variáveis CSS.
   * Cores como orange-500, amber-500 indicam inconsistência com o tema primary/azul.
   */
  private auditHardcodedColors(
    file: string,
    content: string,
    results: AuditResult[],
  ) {
    // Apenas verificar arquivos TSX (componentes visuais)
    if (!file.endsWith(".tsx")) return;

    // Ignorar arquivos de configuração e componentes específicos
    if (file.includes("index.css") || file.includes("tailwind.config")) return;

    // Cores que devem ser usadas com cuidado (podem indicar inconsistência)
    const problematicColorsPattern = /(?:text|bg|border|ring|shadow)-(?:orange|amber)-(?:400|500|600|700)/g;
    const matches = content.match(problematicColorsPattern) || [];

    // Contar ocorrências únicas para evitar falsos positivos em uso semântico (warnings, etc)
    const uniqueColors = [...new Set(matches)];

    // Se mais de 5 usos, provavelmente não é intencional (alarm states etc)
    if (uniqueColors.length > 0 && matches.length > 5) {
      results.push({
        file,
        status: "WARN",
        severity: "LOW",
        message: `Detectadas ${matches.length} ocorrências de cores hardcoded (${uniqueColors.join(', ')}).`,
        violation: "Hardcoded Colors (Visual Inconsistency)",
        suggestion:
          "Use variáveis CSS do tema (primary, accent, destructive) ou crie variáveis semânticas para manter consistência visual.",
      });
    }
  }

  private async processFile(file: string): Promise<AuditResult[]> {
    // Pular arquivos que não são TypeScript ou que são de teste
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) return [];
    if (
      file.endsWith(".test.ts") ||
      file.endsWith(".spec.ts") ||
      file.endsWith(".d.ts")
    )
      return [];

    const content = fs.readFileSync(file, "utf8");
    const relativePath = path.relative(process.cwd(), file).replace(/\\/g, "/");

    const fileResults: AuditResult[] = [];

    // Verificações
    this.auditTellDontAsk(relativePath, content, fileResults);
    this.auditSRP(relativePath, content, fileResults);
    this.auditDDDController(relativePath, content, fileResults);
    this.auditLongMethods(relativePath, content, fileResults);
    this.auditHardcodedStrings(relativePath, content, fileResults);
    // Novos Auditores DDD/SOLID
    this.auditTooManyParameters(relativePath, content, fileResults);
    this.auditDeepNesting(relativePath, content, fileResults);
    this.auditMagicNumbers(relativePath, content, fileResults);
    this.auditPrimitiveObsession(relativePath, content, fileResults);
    // Auditor de Consistência Visual
    this.auditHardcodedColors(relativePath, content, fileResults);

    return fileResults;
  }

  private reportResults(results: AuditResult[]) {
    const fails = results.filter((r) => r.status === "FAIL").length;
    const warns = results.filter((r) => r.status === "WARN").length;

    if (fails > 0 || warns > 0) {
      logger.warn(
        `Auditoria concluída com ${fails} Falhas e ${warns} Alertas.`,
        { source: "Audit/ArchitecturalAuditor" },
      );
    } else {
      logger.success(
        "Auditoria concluída: 100% de conformidade arquitetural.",
        { source: "Audit/ArchitecturalAuditor" },
      );
    }
  }
}
