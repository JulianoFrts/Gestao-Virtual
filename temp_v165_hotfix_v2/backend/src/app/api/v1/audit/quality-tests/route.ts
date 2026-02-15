import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth/session";
import { spawn } from "child_process";
import { logger } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    // Ensure only admins can trigger the test runner
    const user = await requireAdmin();
    // Log the invocation for audit trails
    logger.info("Backend Quality Test Runner invoked manually via API", {
        url: _request.url,
        userId: user.id
    });

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        // Spawn the test process
        // We use 'npm run test' to ensure we use the local jest installation and config
        const isWindows = process.platform === "win32";
        const cmd = isWindows ? "npm.cmd" : "npm";

        // Removed --json to ensure we get real-time terminal output (PASS/FAIL lines) instead of a final JSON blob
        const testProcess = spawn(cmd, ["run", "test", "--", "--no-color"], {
          cwd: process.cwd(),
          env: { ...process.env, CI: "true" }, // Force CI mode to avoid watch mode or interactive prompts
          shell: false,
        });

        // Helper to process logs
        const processLog = (data: Buffer, type: 'stdout' | 'stderr') => {
          const lines = data.toString().split('\n');
          lines.forEach(line => {
             if (line.trim()) {
                 // Remove ANSI codes if any slipped through (though --no-color helps)
                 // eslint-disable-next-line no-control-regex
                 const cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                 sendEvent({ type: 'log', source: type, message: cleanLine });
             }
          });
        };

        testProcess.stdout.on("data", (data) => processLog(data, 'stdout'));
        testProcess.stderr.on("data", (data) => processLog(data, 'stderr'));

        testProcess.on("error", (err) => {
          sendEvent({ type: 'error', message: `Failed to start test runner: ${err.message}` });
          controller.close();
        });

        testProcess.on("close", (code) => {
          sendEvent({ type: 'result', code: code, message: code === 0 ? "Tests passed successfully" : "Tests failed" });
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable buffering for Nginx/Proxies
      },
    });

  } catch (error: any) {
    // If auth fails or any sync error occurs before streaming starts
    return new Response(JSON.stringify({ error: error.message || "Internal Server Error" }), {
      status: error.status === 401 ? 401 : 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
