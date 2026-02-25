import { NextResponse } from "next/server";
import { AuditScanner } from "@/modules/audit/application/audit-scanner";
import { AuditConfigService } from "@/modules/audit/infrastructure/config/audit-config.service";
import { GitDiffService } from "@/modules/audit/infrastructure/git/git-diff.service";
import { HTTP_STATUS } from "@/lib/constants";
import * as path from "path";

export async function GET() {
  try {
    const root = process.cwd();
    const srcPath = path.join(root, "src"); // Or backend/src if monorepo logic applies?
    // Wait, project structure:
    // c:\Users\Juliano Freitas\Documents\GitHub\Gestao-Virtual\backend\src
    // The previous code resolves to `src`. If creating Auditor in backend, `process.cwd()` is probably `backend`.

    // Let's rely on what ArchitecturalAuditor does:
    // path.resolve(basePath || path.join(root, "src"));

    const configService = new AuditConfigService();
    const gitService = new GitDiffService();

    // We need to match ArchitecturalAuditor logic.
    // If I instantiate AuditScanner directly, I should pass the same path.
    // ArchitecturalAuditor doesn't take srcPath in constructor, it calculates it.
    // Let's assume process.cwd() is the project root where `src` exists.

    const effectivePath = path.join(process.cwd(), "src");

    const scanner = new AuditScanner(effectivePath, configService, gitService);

    const start = Date.now();
    const files = await scanner.getFilesToAudit(false);
    const duration = Date.now() - start;

    return NextResponse.json({
      count: files.length,
      duration: `${duration}ms`,
      path: effectivePath,
      files: files.slice(0, 100), // First 100 files for verification
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}
