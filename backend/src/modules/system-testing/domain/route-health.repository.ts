export interface RouteHealthResult {
    route: string;
    status: "UP" | "DOWN" | "SECURE" | "UNSTABLE";
    latency: string;
    code: number;
    message: string;
}

export interface RouteHealthRepository {
    saveHistory(result: RouteHealthResult, performerId: string): Promise<void>;
}
