import * as ts from "typescript";
import { AuditRule, AuditResult } from "./audit-rule.interface";

/**
 * Detecta segredos hardcoded no código (tokens, senhas, chaves API)
 * Severidade: HIGH — risco de segurança crítico
 */
export class HardcodedSecretsRule implements AuditRule {
  name = "Hardcoded Secrets";
  category = "Security";

  private readonly SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> =
    [
      {
        pattern:
          /(?:api[_-]?key|apikey)\s*[:=]\s*['"][A-Za-z0-9_\-]{16,}['"]/gi,
        label: "API Key",
      },
      {
        pattern:
          /(?:secret|jwt[_-]?secret|auth[_-]?secret)\s*[:=]\s*['"][^'"]{8,}['"]/gi,
        label: "Secret/JWT Secret",
      },
      {
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"][^'"]{4,}['"]/gi,
        label: "Senha",
      },
      {
        pattern:
          /(?:access[_-]?token|bearer)\s*[:=]\s*['"][A-Za-z0-9_.\-]{20,}['"]/gi,
        label: "Token de Acesso",
      },
      {
        pattern: /(?:private[_-]?key)\s*[:=]\s*['"][^'"]{20,}['"]/gi,
        label: "Chave Privada",
      },
      { pattern: /sk_(?:live|test)_[A-Za-z0-9]{20,}/g, label: "Stripe Key" },
      { pattern: /ghp_[A-Za-z0-9]{36,}/g, label: "GitHub Token" },
      {
        pattern:
          /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
        label: "JWT Token inline",
      },
    ];

  execute(
    file: string,
    _sourceFile: ts.SourceFile,
    content: string,
  ): AuditResult[] {
    // Ignorar arquivos de teste, .env, config de exemplo
    if (
      file.includes(".test.") ||
      file.includes(".spec.") ||
      file.includes(".env") ||
      file.includes("example")
    )
      return [];

    const results: AuditResult[] = [];

    for (const { pattern, label } of this.SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        // Verificar se está em process.env (false positive)
        const isEnvRef = matches.some((m) =>
          content.includes(`process.env.${m.split(/[:=]/)[0].trim()}`),
        );
        if (isEnvRef) continue;

        results.push({
          file,
          status: "FAIL",
          severity: "HIGH",
          message: `${label} hardcoded detectado (${matches.length}x).`,
          violation: "Secret Hardcoded",
          suggestion:
            "Mova para variáveis de ambiente (.env) e use process.env.",
          category: this.category,
        });
      }
    }

    return results;
  }
}
