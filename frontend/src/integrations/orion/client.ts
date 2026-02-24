/**
 * ORION API Client
 *
 * Cliente HTTP para comunicação com o backend local ORION (Next.js 14+ App Router).
 * Implementa interface compatível com o db JS SDK para facilitar a migração.
 */

import { signal, effect } from "@preact/signals-react";

const API_URL = import.meta.env.VITE_API_URL || "/api/v1";
const DB_MODE = import.meta.env.VITE_DB_MODE || 'orion_db';

console.log('[ORION CLIENT] Initialized with:', { API_URL, DB_MODE });

export const isLocalMode = DB_MODE === 'local';

interface ApiResponse<T> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number;
}

interface QueryBuilder<T = any> {
  select: (columns?: string) => QueryBuilder<T>;
  insert: (data: Partial<T> | Partial<T>[]) => QueryBuilder<T>;
  update: (data: Partial<T>) => QueryBuilder<T>;
  upsert: (data: Partial<T> | Partial<T>[], options?: { onConflict?: string }) => QueryBuilder<T>;
  delete: () => QueryBuilder<T>;
  eq: (column: string, value: any) => QueryBuilder<T>;
  neq: (column: string, value: any) => QueryBuilder<T>;
  is: (column: string, value: any) => QueryBuilder<T>;
  in: (column: string, values: any[]) => QueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder<T>;
  limit: (count: number) => QueryBuilder<T>;
  single: () => Promise<ApiResponse<T>>;
  maybeSingle: () => Promise<ApiResponse<T | null>>;
  or: (query: string) => QueryBuilder<T>;
  then: (resolve: (value: ApiResponse<T[]>) => void) => Promise<void>;
}

export class OrionApiClient {
  public baseUrl: string;
  public tokenSignal = signal<string | null>(null);
  public userSignal = signal<any | null>(null);
  private authListeners: Array<(event: string, session: any) => void> = [];
  private last401Time: number = 0;
  private readonly AUTH_THROTTLE_MS = 5000;
  private readonly RENDER_CACHE_TTL = 3000; // Cache de 3s para renderização
  private renderCache = new Map<string, { data: any; timestamp: number }>();

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.loadToken();

    effect(() => {
      const currentToken = this.tokenSignal.value;
      try {
        if (currentToken) {
          localStorage.setItem("orion_token", currentToken);
          localStorage.setItem("token", currentToken);
        } else {
          localStorage.removeItem("orion_token");
          localStorage.removeItem("token");
        }
      } catch (e) {
        console.warn("[ORION CLIENT] LocalStorage access denied during effect:", e);
      }
    });
  }

  get token(): string | null {
    return this.tokenSignal.value;
  }

  set token(value: string | null) {
    this.tokenSignal.value = value;
  }

  private loadToken() {
    try {
      const storedToken =
        localStorage.getItem("token") ||
        localStorage.getItem("orion_token") ||
        localStorage.getItem("next-auth.session-token") ||
        localStorage.getItem("db.auth.token");

      let finalToken =
        storedToken && storedToken !== "undefined" && storedToken !== "null"
          ? storedToken
          : null;

      if (finalToken && (finalToken.trim().startsWith("{") || finalToken.trim().startsWith("["))) {
        try {
          const parsed = JSON.parse(finalToken);
          if (parsed.access_token) {
            finalToken = parsed.access_token;
          } else if (parsed.currentSession?.access_token) {
            finalToken = parsed.currentSession.access_token;
          }
        } catch (e) {
          // ignore
        }
      }

      this.tokenSignal.value = finalToken;
    } catch (e) {
      console.error("[ORION CLIENT] Failed to load token from LocalStorage:", e);
      this.tokenSignal.value = null;
    }
  }

  private notifyAuthChange(event: string, session: any) {
    this.authListeners.forEach((listener) => listener(event, session));
  }

  setToken(token: string, initialSession?: any) {
    this.tokenSignal.value = token;
    if (initialSession?.user) {
      this.userSignal.value = initialSession.user;
      this.notifyAuthChange("SIGNED_IN", initialSession);
    }
    this.auth.getSession().then((res) => {
      const user = res.data?.session?.user || null;
      this.userSignal.value = user;
      this.notifyAuthChange("SIGNED_IN", res.data?.session);
    });
  }

  clearToken() {
    this.tokenSignal.value = null;
    this.userSignal.value = null;
    this.notifyAuthChange("SIGNED_OUT", null);
  }

  private async request<T>(
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
    body?: any,
    params?: Record<string, string>,
  ): Promise<ApiResponse<T>> {
    const cacheKey = `${method}:${endpoint}:${JSON.stringify(params || {})}`;

    // 0. Global Render Cache (Somente para GET)
    if (method === "GET") {
      const cached = this.renderCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.RENDER_CACHE_TTL) {
        // console.log(`[ORION CACHE] Hit: ${endpoint}`);
        return { data: cached.data, error: null };
      }
    }

    try {
      const isAuthEndpoint = endpoint.includes("/auth/") || endpoint.includes("/health");
      const publicEndpoints = ["/auth/login", "/auth/register", "/health", "/api/health"];
      const isPublic = publicEndpoints.some(p => endpoint.includes(p));

      if (!isPublic && !this.token) {
        console.warn(`[ORION API] Aborted request to protected endpoint ${endpoint} without token.`);
        return {
          data: null,
          error: { message: "Não autenticado: Token ausente", code: "401" },
        };
      }

      if (!isAuthEndpoint && this.last401Time > 0) {
        const elapsed = Date.now() - this.last401Time;
        if (elapsed < this.AUTH_THROTTLE_MS) {
          return {
            data: null,
            error: { message: "Monitoramento de Segurança: Requisição bloqueada temporariamente (401 recent)", code: "401" },
          };
        } else {
          this.last401Time = 0;
        }
      }

      const cleanEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
      const cleanBaseUrl = this.baseUrl.endsWith("/") ? this.baseUrl : `${this.baseUrl}/`;
      const fullUrl = this.baseUrl.startsWith("http")
        ? `${cleanBaseUrl}${cleanEndpoint}`
        : `${window.location.origin}${cleanBaseUrl}${cleanEndpoint}`;

      const url = new URL(fullUrl);
      
      // Cache-busting para GET - Garante dados frescos do banco
      if (method === "GET") {
        url.searchParams.append("_t", Date.now().toString());
      }

      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const headers: Record<string, string> = {};

      // Cache-busting apenas para mutações (POST, PUT, PATCH, DELETE)
      // GETs podem ser cacheados pelo browser para melhor performance
      if (method !== "GET") {
        headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        headers["Pragma"] = "no-cache";
        headers["Expires"] = "0";
      }

      if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const options: RequestInit = {
        method,
        headers,
        cache: "no-store",
        credentials: "include",
      };

      if (method !== "GET" && body) {
        options.body = body instanceof FormData ? body : JSON.stringify(body);
      }

      let response = await fetch(url.toString(), options);

      // Retry logic for 429
      let retries = 0;
      const MAX_RETRIES = 3;
      let backoff = 1000;
      while (response.status === 429 && retries < MAX_RETRIES) {
        retries++;
        const waitTime = parseInt(response.headers.get("Retry-After") || "0") * 1000 || backoff;
        await new Promise(resolve => setTimeout(resolve, waitTime));
        response = await fetch(url.toString(), options);
        backoff *= 2;
      }

      if (method === "DELETE" && response.status === 204) {
        return { data: null, error: null };
      }

      let json: any = {};
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try { json = await response.json(); } catch (err) { /* ignore */ }
      } else if (!response.ok) {
        return {
          data: null,
          error: {
            message: response.status === 404 ? `Endpoint ${endpoint} não encontrado.` : `Erro ${response.status} no servidor.`,
            code: String(response.status),
          },
        };
      }

      if (!response.ok) {
        if (response.status === 401) {
          this.last401Time = Date.now();
          this.clearToken();
        }
        return {
          data: null,
          error: { message: json.message || json.error || `Erro ${response.status}`, code: String(response.status) },
        };
      }

      const data = json.data !== undefined ? json.data : json;
      
      // Salvar no Render Cache se for GET bem sucedido
      if (method === "GET" && !response.status.toString().startsWith('4')) {
          this.renderCache.set(cacheKey, { data, timestamp: Date.now() });
      }

      if (data && typeof data === "object" && !Array.isArray(data) && Array.isArray(data.items)) {
        return { data: data.items, error: null, count: data.pagination?.total || data.items.length };
      }

      return { data, error: null, count: json.count };
    } catch (err: any) {
      const isConnectionError = err instanceof TypeError && err.message === 'Failed to fetch';
      if (!navigator.onLine || isConnectionError) {
        console.warn(`[ORION API] ${isConnectionError ? 'Connection failed' : 'Offline'}: ${method} ${endpoint}`);
      } else {
        console.error(`[ORION API] Fetch error on ${method} ${endpoint}:`, err);
      }
      return { data: null, error: { message: "Não foi possível conectar ao servidor ORION." } };
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, "GET", undefined, params);
  }

  async post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, "POST", body);
  }

  async put<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, "PUT", body);
  }

  async patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, "PATCH", body);
  }

  async delete<T>(endpoint: string, params?: Record<string, string>) {
    return this.request<T>(endpoint, "DELETE", undefined, params);
  }

  from<T = any>(table: string): QueryBuilder<T> {
    const activeTable = table;
    let method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET";
    let body: any = null;
    const filters: Array<{ column: string; op: string; value: any }> = [];
    let selectedColumns = "*";
    let orderBy: { column: string; ascending: boolean } | null = null;
    let limitCount: number | null = null;

    const getIdFromFilters = () => {
      const idFilter = filters.find((f) => f.column === "id" && f.op === "eq");
      return idFilter ? idFilter.value : null;
    };

    const buildQueryParams = (): Record<string, string> => {
      const p: Record<string, string> = {};
      filters.forEach((f) => {
        if (f.op === 'or') {
            p['or'] = String(f.value);
        } else {
            p[f.column] = String(f.value);
        }
      });
      if (limitCount) p["limit"] = String(limitCount);
      return p;
    };

    const execute = async (): Promise<ApiResponse<any>> => {
      let id = getIdFromFilters();
      if (!id && (method === "PUT" || method === "PATCH") && body && typeof body === "object" && !Array.isArray(body)) {
        id = (body as any).id || (body as any).userId;
      }
      // If we have an ID and it's a PUT/PATCH, we often want to ENSURE it's NOT in the body 
      // if the backend uses strict schemas, OR we keep it if the backend needs it.
      // However, most Next.js routes treat body and path separately. 
      // To be safe and avoid Zod 'extra field' errors, we'll strip 'id' from body if it's already in the path-bound ID.
      if ((method === "PUT" || method === "PATCH") && id && body && typeof body === "object" && !Array.isArray(body)) {
          const { id: _, ...bodyWithoutId } = body as any;
          body = bodyWithoutId;
      }

      let endpoint = `/${activeTable}`;
      
      // REST Pattern: if we have an ID, we append it to the path for PUT, PATCH, DELETE 
      // and also for GET if we are using .single() or .maybeSingle() logic.
      // However, to keep it safe, we only do path-based ID for non-GET or if filters specifically have ID.
      if (id && (method !== "GET" || filters.length === 1)) {
          endpoint = `/${activeTable}/${id}`;
      }

      const queryParams = (method === "GET" || method === "DELETE") ? buildQueryParams() : undefined;
      
      // If we moved ID to path, remove it from query params to avoid duplication
      if (id && queryParams && queryParams.id === String(id)) {
          delete queryParams.id;
      }

      const result = await this.request(endpoint, method, body, queryParams);

      if (result.data && Array.isArray(result.data) && orderBy) {
        result.data.sort((a, b) => {
          const aVal = a[orderBy!.column];
          const bVal = b[orderBy!.column];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return orderBy!.ascending ? comparison : -comparison;
        });
      }

      if (result.data && Array.isArray(result.data) && limitCount) {
        result.data = result.data.slice(0, limitCount);
      }

      return result;
    };

    const builder: QueryBuilder<T> = {
      select: (columns = "*") => { selectedColumns = columns; return builder; },
      insert: (data) => { method = "POST"; body = data; return builder; },
      update: (data) => { method = "PUT"; body = data; return builder; },
      upsert: (data) => { method = "POST"; body = data; return builder; },
      delete: () => { method = "DELETE"; return builder; },
      eq: (column, value) => { filters.push({ column, op: "eq", value }); return builder; },
      neq: (column, value) => { filters.push({ column, op: "neq", value }); return builder; },
      is: (column, value) => { filters.push({ column, op: "is", value }); return builder; },
      in: (column, values) => { filters.push({ column, op: "in", value: values.join(",") }); return builder; },
      or: (query: string) => { filters.push({ column: 'or', op: 'or', value: query }); return builder; },
      order: (column, options = { ascending: true }) => { orderBy = { column, ascending: options.ascending ?? true }; return builder; },
      limit: (count) => { limitCount = count; return builder; },
      single: async () => {
        const result = await execute();
        if (result.error) return result;
        const data = Array.isArray(result.data) ? result.data[0] : result.data;
        if (!data) return { data: null, error: { message: "Not found", code: "404" } };
        return { data, error: null };
      },
      maybeSingle: async () => {
        const result = await execute();
        if (result.error) return result;
        const data = Array.isArray(result.data) ? result.data[0] : result.data;
        return { data: data || null, error: null };
      },
      then: async (resolve) => {
        const result = await execute();
        const arrayData = Array.isArray(result.data) ? result.data : result.data ? [result.data] : [];
        resolve({ ...result, data: arrayData });
      },
    };
    return builder;
  }

  async rpc<T = any>(functionName: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const result = await this.request<T>(`/rpc/${functionName}`, "POST", params);
    return result;
  }

  auth = {
    signInWithPassword: async (credentials: { email: string; password: string; }) => {
      const result = await this.request<{ user: any; token: string; access_token: string; }>("/auth/login", "POST", credentials);
      const token = result.data?.access_token || result.data?.token;
      if (token && result.data?.user) {
        const user = { id: result.data.user.id || result.data.user.userId, email: result.data.user.email || credentials.email, ...result.data.user };
        const session = { access_token: token, token_type: "bearer", expires_in: 3600, refresh_token: "local-mock-refresh", user: user };
        this.setToken(token, session);
        return { data: { user, session }, error: null };
      }
      return { data: { user: null, session: null }, error: result.error };
    },
    signIn: async (credentials: { email: string; password: string }) => {
      return this.auth.signInWithPassword(credentials);
    },
    signUp: async (credentials: { email: string; password: string; options?: any; }) => {
      const result = await this.request<{ user: any }>("/auth/register", "POST", { email: credentials.email, password: credentials.password, ...credentials.options?.data });
      return { data: { user: result.data?.user || null, session: null }, error: result.error };
    },
    signOut: async () => {
      this.clearToken();
      return { error: null };
    },
    getUser: async () => {
      if (!this.token) return { data: { user: null }, error: null };
      const res = await this.request<any>("/auth/me", "GET");
      return { data: { user: res.data }, error: res.error };
    },
    getSession: async () => {
      if (!this.token) return { data: { session: null }, error: null };
      const res = await this.request<any>("/auth/session", "GET");
      const sessionData = res.data?.user || res.data;
      const session = sessionData && Object.keys(sessionData).length > 0 && (sessionData.id || sessionData.userId)
        ? { access_token: this.token, token_type: "bearer", expires_in: 3600, refresh_token: "local-mock-refresh", user: sessionData }
        : null;
      return { data: { session }, error: res.error };
    },
    setSession: async (session: { access_token: string; refresh_token: string; }) => {
      if (session.access_token) {
        this.setToken(session.access_token);
        const mockSession = { access_token: session.access_token, token_type: "bearer", expires_in: 3600, refresh_token: session.refresh_token, user: null };
        return { data: { session: mockSession, user: null }, error: null };
      }
      return { data: { session: null, user: null }, error: { message: "Invalid session" } };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authListeners.push(callback);
      this.auth.getSession().then((res) => {
        if (res.data?.session) callback("INITIAL_SESSION", res.data.session);
      });
      return { data: { subscription: { unsubscribe: () => { this.authListeners = this.authListeners.filter((l) => l !== callback); } } } };
    },
    resetPasswordForEmail: async (email: string, options?: any) => {
      const result = await this.request("/auth/reset-password", "POST", { email, ...options });
      return { data: {}, error: result.error };
    },
    updateUser: async (attributes: any) => {
      const result = await this.request<any>("/auth/update", "PUT", attributes);
      return { data: { user: result.data }, error: result.error };
    },
  };

  storage = {
    from: (bucket: string) => ({
      getPublicUrl: (path: string) => {
        const endpoint = bucket === "photos" ? "photos" : "documents";
        return { data: { publicUrl: `${this.baseUrl}/storage/${endpoint}?path=${path}` } };
      },
      upload: async (path: string, file: File) => {
        const endpoint = bucket === "photos" ? "photos" : "documents";
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", path);
        return this.request(`/storage/${endpoint}`, "POST", formData);
      },
      download: async (path: string) => {
        const endpoint = bucket === "photos" ? "photos" : "documents";
        const url = `${this.baseUrl}/storage/${endpoint}?path=${path}`;
        const response = await fetch(url, { headers: this.token ? { Authorization: `Bearer ${this.token}` } : {} });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        return { data: blob, error: null };
      },
      createSignedUrl: async (path: string, expiresIn: number) => {
        const endpoint = bucket === "photos" ? "photos" : "documents";
        return { data: { signedUrl: `${this.baseUrl}/storage/${endpoint}?path=${path}` }, error: null };
      },
      remove: async (paths: string[]) => {
        console.warn("[ORION STORAGE] Remove not yet implemented");
        return { error: null };
      },
    }),
  };
}

export const orionApi = new OrionApiClient(API_URL);
export const localApi = orionApi;
