import { RouteHealthRepository, RouteHealthResult } from "../domain/route-health.repository";
import { HTTP_STATUS } from "@/lib/constants";
const DEFAULT_TIMEOUT_MS = 30000;

export class SystemTestingService {
    constructor(private readonly repository: RouteHealthRepository) { }

    public async checkCriticalRoutes(routes: string[], userId: string): Promise<RouteHealthResult[]> {
        return Promise.all(
            routes.map((route) => this.checkSingleRoute(route, userId))
        );
    }

    private async checkSingleRoute(route: string, userId: string): Promise<RouteHealthResult> {
        const start = this.timeProvider ? this.timeProvider.now().getTime() : this.timeProvider.now().getTime();
        try {
            const baseUrl = process.env.NEXTAUTH_URL || "http://127.0.0.1: 3000";
            const controller = new AbortController();

            // Magic Number original: 2000ms. Vou usar uma constante local ou expandir index.ts
            const timeoutToken = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(`${baseUrl}${route}`, {
                method: "HEAD",
                headers: { "x-internal-check": "true" },
                signal: controller.signal,
            });
            clearTimeout(timeoutToken);

            const latencyMs = this.timeProvider ? this.timeProvider.now().getTime() : this.timeProvider.now().getTime() - start;
            const status = this.interpretResponseStatus(response);

            const result: RouteHealthResult = {
                route,
                status,
                latency: `${latencyMs}ms`,
                code: response.status,
                message: this.getResponseMessage(status, response.statusText),
            };

            await this.repository.saveHistory(result, userId);
            return result;

        } catch (error: unknown) {
            const latencyMs = this.timeProvider ? this.timeProvider.now().getTime() : this.timeProvider.now().getTime() - start;
            const resultError: RouteHealthResult = {
                route,
                status: "DOWN",
                latency: `${latencyMs}ms`,
                code: HTTP_STATUS.INTERNAL_ERROR,
                message: error.message || "Erro de conexão fatal",
            };

            await this.repository.saveHistory(resultError, userId);
            return resultError;
        }
    }

    private interpretResponseStatus(response: Response): RouteHealthResult["status"] {
        if (response.status === HTTP_STATUS.UNAUTHORIZED || response.status === HTTP_STATUS.FORBIDDEN) {
            return "SECURE";
        }

        if (response.ok) {
            return "UP";
        }

        if (response.status < HTTP_STATUS.INTERNAL_ERROR) {
            return "UNSTABLE";
        }

        return "DOWN";
    }

    private getResponseMessage(status: RouteHealthResult["status"], statusText: string): string {
        if (statusText) return statusText;

        switch (status) {
            case "SECURE": return "Protegido (Autenticado)";
            case "UP": return "Operacional";
            default: return "Erro na rota";
        }
    }
}
