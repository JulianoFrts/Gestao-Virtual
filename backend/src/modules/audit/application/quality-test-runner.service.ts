import { spawn } from "child_process";
import { logger } from "@/lib/utils/logger";

export interface TestRunnerEvent {
    type: 'log' | 'error' | 'result';
    source?: 'stdout' | 'stderr';
    message?: string;
    code?: number | null;
}

export class QualityTestRunnerService {
    /**
     * Inicia a execução dos testes de qualidade e retorna um ReadableStream
     */
    public runTestsStream(): ReadableStream {
        const encoder = new TextEncoder();

        return new ReadableStream({
            start: (controller) => {
                const sendEvent = (data: TestRunnerEvent) => {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    const isWindows = process.platform === "win32";
                    const cmd = isWindows ? "npm.cmd" : "npm";

                    // Spawn the test process
                    const testProcess = spawn(cmd, ["run", "test", "--", "--no-color"], {
                        cwd: process.cwd(),
                        env: { ...process.env, CI: "true" },
                        shell: false,
                    });

                    testProcess.stdout.on("data", (result) => this.processLog(data, 'stdout', sendEvent));
                    testProcess.stderr.on("data", (result) => this.processLog(data, 'stderr', sendEvent));

                    testProcess.on("error", (err) => {
                        sendEvent({ type: 'error', message: `Falha ao iniciar o executor de testes: ${err.message}` });
                        controller.close();
                    });

                    testProcess.on("close", (code) => {
                        sendEvent({
                            type: 'result',
                            code: code,
                            message: code === 0 ? "Testes aprovados com sucesso" : "Testes falharam"
                        });
                        controller.close();
                    });
                } catch (error: unknown) {
                    sendEvent({ type: 'error', message: `Erro fatal no executor: ${error.message}` });
                    controller.close();
                }
            },
        });
    }

    /**
     * Processa os logs brutos do processo
     */
    private processLog(data: Buffer, type: 'stdout' | 'stderr', sendEvent: (data: TestRunnerEvent) => void) {
        const lines = data.toString().split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                // Remove códigos ANSI (cores/formatação do terminal)
                // eslint-disable-next-line no-control-regex
                const cleanLine = line.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');
                sendEvent({ type: 'log', source: type, message: cleanLine });
            }
        });
    }
}
