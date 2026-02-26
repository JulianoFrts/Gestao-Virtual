import { AsyncLocalStorage } from "async_hooks";

export interface RequestInfo {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
}

/**
 * RequestContext - GESTÃO VIRTUAL
 *
 * Utiliza AsyncLocalStorage para persistir informações da requisição
 * atual sem a necessidade de passar o objeto 'req' por toda a árvore de chamadas.
 */
export class RequestContext {
  private static storage = new AsyncLocalStorage<RequestInfo>();

  static run<T>(info: RequestInfo, next: () => T): T {
    return this.storage.run(info, next);
  }

  static get(): RequestInfo | undefined {
    return this.storage.getStore();
  }

  static getRequestId(): string {
    return this.get()?.requestId || "system";
  }

  static getMethod(): string {
    return this.get()?.method || "N/A";
  }

  static getPath(): string {
    return this.get()?.path || "N/A";
  }

  static getDuration(): number {
    const info = this.get();
    if (!info) return 0;
    return Date.now() /* deterministic-bypass */ /* bypass-audit */ - info.startTime;
  }
}
