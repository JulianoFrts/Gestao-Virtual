import * as ts from "typescript";

export interface AuditResult {
    file: string;
    status: "PASS" | "FAIL" | "WARN";
    message: string;
    violation?: string;
    suggestion?: string;
    severity?: "HIGH" | "MEDIUM" | "LOW";
    category?: string;
}

export interface AuditRule {
    name: string;
    category: string;

    execute(
        file: string,
        sourceFile: ts.SourceFile,
        content: string
    ): AuditResult[];
}
