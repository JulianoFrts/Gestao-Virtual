import { ArchitecturalAuditor, AuditResult } from "../src/modules/audit/application/architectural-auditor.service";
import { GovernanceService } from "../src/modules/audit/application/governance.service";
import * as path from "path";
import * as fs from "fs";

// Mock Repository to avoid DB dependency for this scan
class MockGovernanceRepository {
    async findGovernanceHistory(limit: number) { return []; }
    async findRouteHealthHistory(limit: number) { return []; }
    async findOpenViolation(file: string, violation: string) { return null; }
    async createViolation(data: any) { 
        // Console log removed to avoid clutter, handled by final report
        return { id: 'mock-id', ...data }; 
    }
    async updateViolation(id: string, data: any) { return { id, ...data }; }
    async findOpenViolations() { return []; }
    async findViolationsWithFilters(filters: any) { return []; }
}

async function main() {
  console.log("Starting Frontend Audit Scan...");
  try {
    const repo = new MockGovernanceRepository();
    const governanceService = new GovernanceService(repo as any);

    const frontendPath = path.join(process.cwd(), "..", "frontend", "src");
    const reportPath = path.join(process.cwd(), "..", "frontend", "AUDIT_REPORT.md");

    console.log(`Scanning directory: ${frontendPath}`);

    const auditor = new ArchitecturalAuditor(governanceService, frontendPath);
    const results = await auditor.runFullAudit("system-cli-frontend-scan");

    console.log("---FRONTEND_RESULTS_START---");
    
    let reportContent = "# Relatório de Auditoria Frontend (Code Smells)\n\n";
    reportContent += `Data: ${new Date().toISOString()}\n`;
    reportContent += `Escopo: ${frontendPath}\n\n`;
    reportContent += "## Violações Detectadas\n\n";

    let issuesCount = 0;
    const groupedResults: Record<string, AuditResult[]> = {};

    results.forEach((r) => {
      if (r.status === "FAIL" || r.status === "WARN") {
        issuesCount++;
        console.log(`[${r.status}] ${r.file}: ${r.message} (${r.violation})`);
        
        if (!groupedResults[r.file]) groupedResults[r.file] = [];
        groupedResults[r.file].push(r);
      }
    });

    if (issuesCount === 0) {
      console.log("No issues found in frontend code.");
      reportContent += "✅ Nenhum problema encontrado.\n";
    } else {
      console.log(`Found ${issuesCount} issues.`);
       Object.entries(groupedResults).forEach(([file, violations]) => {
           reportContent += `### 📄 ${file}\n`;
           violations.forEach(v => {
               reportContent += `- **[${v.status}] ${v.violation}**\n`;
               reportContent += `  - Mensagem: ${v.message}\n`;
               reportContent += `  - Sugestão: ${v.suggestion}\n`;
           });
           reportContent += "\n";
       });
    }
    
    console.log("---FRONTEND_RESULTS_END---");

    fs.writeFileSync(reportPath, reportContent);
    console.log(`Report saved to: ${reportPath}`);

  } catch (error) {
    console.error("Error running frontend audit:", error);
    process.exit(1);
  }
}

main();
