import { NextResponse } from "next/server";
import { AuditScanner } from "@/modules/audit/application/audit-scanner";
import { AuditConfigService } from "@/modules/audit/infrastructure/config/audit-config.service";
import { GitDiffService } from "@/modules/audit/infrastructure/git/git-diff.service";
import { HTTP_STATUS } from "@/lib/constants";
import { requireAdmin } from "@/lib/auth/session";
import * as path from "path";

import { SystemTimeProvider } from "@/lib/utils/time-provider";

const timeProvider = new SystemTimeProvider();

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    const root = process.cwd();
    const srcPath = path.join(root, "src");

    const configService = new AuditConfigService();
    const gitService = new GitDiffService();

    const effectivePath = path.join(process.cwd(), "src");

    const scanner = new AuditScanner(effectivePath, configService, gitService);

    const start = timeProvider.now().getTime();
    const files = await scanner.getFilesToAudit(false);
    const duration = timeProvider.now().getTime() - start;

    return NextResponse.json({
      count: files.length,
      duration: `${duration}ms`,
      path: effectivePath,
      files: files.slice(0, 100), // First 100 files for verification
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error.message },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}
