import { AuditResult } from "../domain/rules/audit-rule.interface";

export interface AuditSummary {
    healthScore: number; // 0-100
    totalFiles: number;
    violationsCount: number;
    byCategory: Record<string, number>;
    bySeverity: { HIGH: number; MEDIUM: number; LOW: number };
    topIssues: string[];
}

export class AuditReportService {
    public calculateHealthScore(
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

    public generateEmptyReport(totalFiles: number): AuditSummary {
        return {
            healthScore: 100,
            totalFiles,
            violationsCount: 0,
            byCategory: {},
            bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
            topIssues: []
        };
    }
}
