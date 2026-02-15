/**
 * ORION API Client
 *
 * Cliente HTTP para comunicação com o backend local ORION (Next.js 14+ App Router).
 * Implementa interface compatível com o db JS SDK para facilitar a migração.
 */

const API_URL = import.meta.env.VITE_API_URL || "https://api.gestaovirtual.com/api/v1";
const DB_MODE = import.meta.env.VITE_DB_MODE || 'orion_db';

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
  then: (resolve: (value: ApiResponse<T[]>) => void) => Promise<void>;
}

import { signal, effect } from "@preact/signals-react";

export class OrionApiClient {
  public baseUrl: string;
  public tokenSignal = signal<string | null>(null);
  public userSignal = signal<any | null>(null);
  private authListeners: Array<(event: string, session: any) => void> = [];
  // Throttle para evitar loop infinito de erros 401
  private last401Time: number = 0;
  private readonly AUTH_THROTTLE_MS = 5000; // 5 segundos de throttle após erro 401

  constructor(baseUrl: string) {
    // Remover trailing slash da baseUrl para evitar double slashes
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;

    // Recuperar token do localStorage se existir
    this.loadToken();

    // Sincronizar tokenSignal com a propriedade legada token
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
        console.warn(
          "[ORION CLIENT] LocalStorage access denied during effect:",
          e,
        );
      }
    });
  }

  // Getter para compatibilidade com código que usa .token
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

      // SE o token parece um JSON (vindo do db), extraímos apenas o access_token
      if (
        finalToken &&
        (finalToken.trim().startsWith("{") || finalToken.trim().startsWith("["))
      ) {
        try {
          const parsed = JSON.parse(finalToken);
          if (parsed.access_token) {
            finalToken = parsed.access_token;
            console.log("[ORION CLIENT] Access token extracted from db JSON");
          } else if (parsed.currentSession?.access_token) {
            finalToken = parsed.currentSession.access_token;
          }
        } catch (e) {
          // Se falhar o parse, mantém o original (pode ser um token JWT puro)
        }
      }

      this.tokenSignal.value = finalToken;
    } catch (e) {
      console.error(
        "[ORION CLIENT] Failed to load token from LocalStorage:",
        e,
      );
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
    try {
      // Throttle: Se recebemos 401 recentemente, não tenta novamente por AUTH_THROTTLE_MS
      // Exceto para endpoints de login/auth que precisam funcionar
      const isAuthEndpoint = endpoint.includes("/auth/") || endpoint.includes("/health");

      // 1. Verificar se temos token para rotas protegidas
      // Rotas públicas que não precisam de token:
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
          console.warn(
            `[ORION API] Request blocked: Recent 401 error (${Math.round((this.AUTH_THROTTLE_MS - elapsed) / 1000)}s remaining)`,
          );
          return {
            data: null,
            error: { message: "Monitoramento de Segurança: Requisição bloqueada temporariamente (401 recent)", code: "401" },
          };
        } else {
          // Resetar o throttle após o período
          this.last401Time = 0;
        }
      }

      // Construir URL final
      // Se a URL do endpoint começar com /, removemos para evitar double slash se a baseUrl terminar com /
      const cleanEndpoint = endpoint.startsWith("/")
        ? endpoint.slice(1)
        : endpoint;
      const cleanBaseUrl = this.baseUrl.endsWith("/")
        ? this.baseUrl
        : `${this.baseUrl}/`;

      const fullUrl = this.baseUrl.startsWith("http")
        ? `${cleanBaseUrl}${cleanEndpoint}`
        : `${window.location.origin}${cleanBaseUrl}${cleanEndpoint}`;

      const url = new URL(fullUrl);
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url.searchParams.append(key, value);
        });
      }

      const headers: Record<string, string> = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      };

      // Only set Content-Type if not sending FormData (browser sets boundary automatically)
      if (!(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
      }

      if (this.token) {
        headers["Authorization"] = `Bearer ${this.token}`;
      }

      const options: RequestInit = {
        method,
        headers,
        cache: "no-store" as RequestCache,
        credentials: "include", // Ensure cookies are sent for session-based auth
      };

      if (method !== "GET" && body) {
        // Mapeamento automático de snake_case para camelCase para o body
        // Isso garante compatibilidade com o Backend ORION sem mudar todo o frontend
        if (
          typeof body === "object" &&
          !Array.isArray(body) &&
          !(body instanceof FormData)
        ) {
          const mappedBody: any = { ...body };
          const mappings: Record<string, string> = {
            employee_id: "userId",
            user_id: "userId",
            project_id: "projectId",
            site_id: "siteId",
            company_id: "companyId",
            team_id: "teamId",
            record_type: "recordType",
            recorded_at: "recordedAt",
            photo_url: "photoUrl",
            local_id: "localId",
            created_by: "createdById",
            is_active: "isActive",
            display_order: "displayOrder",
            doc_type: "documentType",
            file_url: "fileUrl",
            file_size: "fileSize",
            folder_path: "folderPath",
          };

          Object.entries(mappings).forEach(([snake, camel]) => {
            if (mappedBody[snake] !== undefined) {
              mappedBody[camel] = mappedBody[snake];
              // Opcionalmente remove o antigo se preferir, mas manter ambos é mais seguro
            }
          });
          options.body = JSON.stringify(mappedBody);
        } else {
          options.body = body instanceof FormData ? body : JSON.stringify(body);
        }
      }

      let response = await fetch(url.toString(), options);

      // --- RETRY LOGIC FOR 429 (TOO MANY REQUESTS) ---
      let retries = 0;
      const MAX_RETRIES = 3;
      let backoff = 1000; // Começa com 1s

      while (response.status === 429 && retries < MAX_RETRIES) {
        retries++;
        const retryAfter = response.headers.get("Retry-After");
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : backoff;

        console.warn(`[ORION API] 429 Too Many Requests detected. Retrying in ${waitTime}ms... (Attempt ${retries}/${MAX_RETRIES})`);

        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Tenta novamente
        response = await fetch(url.toString(), options);
        backoff *= 2; // Exponecial backoff para o próximo se não houver Retry-After
      }
      // ----------------------------------------------

      // Se for DELETE e status 204 (No Content), retorna sucesso vazio
      if (method === "DELETE" && response.status === 204) {
        return { data: null, error: null };
      }

      let json: any = {};
      const contentType = response.headers.get("content-type");

      if (contentType && contentType.includes("application/json")) {
        try {
          json = await response.json();
        } catch (err) {
          console.warn("[ORION API] Failed to parse JSON response", err);
        }
      } else {
        return {
          data: null,
          error: {
            message:
              response.status === 404
                ? `Endpoint ${endpoint} não encontrado (404).`
                : `Erro ${response.status} no servidor (Resposta não-JSON).`,
            code: String(response.status),
          },
        };
      }

      if (!response.ok) {
        // Se o erro for 401 (Unauthorized), o token pode ter expirado ou ser inválido
        if (response.status === 401) {
          console.warn(
            "[ORION API] Unauthorized (401). Clearing token and activating throttle...",
          );
          this.last401Time = Date.now(); // Ativar throttle para evitar loop
          this.clearToken();
        }

        const errorMessage =
          json.message ||
          json.error ||
          `Erro ${response.status} no servidor ORION`;
        const errorsList = json.errors
          ? `\nDetalhes: ${json.errors.join(", ")}`
          : "";
        return {
          data: null,
          error: {
            message: `${errorMessage}${errorsList}`,
            code: String(response.status),
          },
        };
      }

      const data = json.data !== undefined ? json.data : json;

      // Suporte para respostas paginadas do Backend ORION (que vêm em { items: [], pagination: {} })
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        Array.isArray(data.items)
      ) {
        // Se for uma lista paginada, extraímos os itens e preservamos o total se disponível
        const items = data.items;
        const total = data.pagination?.total || items.length;
        return {
          data: items,
          error: null,
          count: total,
        };
      }

      return {
        data,
        error: null,
        count: json.count,
      };
    } catch (err: any) {
      // Se estiver offline ou for erro de conexão, logamos apenas um aviso silencioso (warn) 
      // para não sujar o console com erros vermelhos durante o Modo Offline Premium.
      const isConnectionError = err instanceof TypeError && err.message === 'Failed to fetch';
      if (!navigator.onLine || isConnectionError) {
        console.warn(
          `[ORION API] ${isConnectionError ? 'Connection failed' : 'Offline'}: ${method} ${endpoint}`
        );
      } else {
        console.error(
          `[ORION API] Fetch error on ${method} ${this.baseUrl}${endpoint}:`,
          err,
        );
      }

      return {
        data: null,
        error: {
          message: "Não foi possível conectar ao servidor ORION.",
        },
      };
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
    // Mapeamento automático para o padrão Prisma/ORION (Singular PascalCase)
    const tableMap: Record<string, string> = {
      users: "users",
      profiles: "users",
      User: "users",
      user_roles: "user_roles",
      UserRole: "user_roles",
      employees: "users",
      Employee: "users",
      teams: "teams",
      Team: "teams",
      projects: "projects",
      Project: "projects",
      sites: "sites",
      Site: "sites",
      companies: "companies",
      Company: "companies",
      job_functions: "job_functions",
      JobFunction: "job_functions",
      system_messages: "system_messages",
      SystemMessage: "system_messages",
      messages: "system_messages",
      audit_logs: "audit_logs",
      AuditLog: "audit_logs",
      time_records: "time_records",
      TimeRecord: "time_records",
      team_members: "team_members",
      TeamMember: "team_members",
      permission_levels: "permission_levels",
      PermissionLevel: "permission_levels",
      permission_modules: "permission_modules",
      PermissionModule: "permission_modules",
      permission_matrix: "permission_matrix",
      PermissionMatrix: "permission_matrix",
      permission_overrides: "permission_overrides",
      PermissionOverride: "permission_overrides",
      ticket_history: "ticket_history",
      TicketHistory: "ticket_history",
      temporary_permissions: "temporary_permissions",
      TemporaryPermission: "temporary_permissions",
      segments: "segments",
      circuits: "circuits",
      conductors: "conductors",
      segment_circuits: "segment_circuits",
      tower_technical_data: "map_elements",
      span_technical_data: "map_elements",
      map_element_technical_data: "map_elements",
      Project3dCableSettings: "project_3d_cable_settings",
      project_3d_cable_settings: "project_3d_cable_settings",
      map_element_production_progress: "map_element_production_progress",
    };
    const activeTable = tableMap[table] || table;

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
      // Adicionar filtros ao query params
      filters.forEach((f) => {
        // Mapeamento de snake_case para camelCase para compatibilidade com os esquemas Zod do backend Orion
        let key = f.column;
        if (key === "project_id") key = "projectId";
        if (key === "company_id") key = "companyId";
        if (key === "team_id") key = "teamId";
        if (key === "user_id") key = "userId";
        if (key === "employee_id") key = "userId";
        if (key === "site_id") key = "siteId";
        if (key === "tower_type") key = "towerType";
        if (key === "tower_id") key = "towerId";

        // Se o ID não foi usado no path, incluímos na query
        const currentId = getIdFromFilters();
        const tablesWithPathId = [
          "users",
          "profiles",
          "projects",
          "teams",
          "sites",
          "companies",
          "construction_documents",
        ];
        const usesPathId =
          currentId &&
          method !== "POST" &&
          tablesWithPathId.includes(activeTable);

        if (f.column !== "id" || f.op !== "eq" || !usesPathId) {
          p[key] = String(f.value);
        }
      });

      // Enviar limit para o backend se estiver definido
      if (limitCount) {
        p["limit"] = String(limitCount);
      }

      return p;
    };

    const execute = async (): Promise<ApiResponse<any>> => {
      let id = getIdFromFilters();
      console.log(
        "[OrionClient] Execute table:",
        activeTable,
        "Method:",
        method,
        "Initial ID from filters:",
        id,
      );

      // Debug filters if id is missing
      if (!id && (method === "PUT" || method === "PATCH")) {
        console.log(
          "[ORION DEBUG] PUT/PATCH missing ID from filters. Checking body...",
        );
      }

      // Fallback: Se não achou ID nos filtros (eq), tentar achar no body (apenas para PUT/PATCH)
      if (
        !id &&
        (method === "PUT" || method === "PATCH") &&
        body &&
        typeof body === "object" &&
        !Array.isArray(body)
      ) {
        id = body.id || body.userId;
        console.log("[OrionClient] ID found in body for update:", id);
      }

      // Se temos ID e é update, garantir que o ID esteja no body também
      if (
        (method === "PUT" || method === "PATCH") &&
        id &&
        body &&
        typeof body === "object" &&
        !Array.isArray(body)
      ) {
        body = { ...body, id };
      }

      // SÓ anexa o ID na URL se NÃO for POST e for uma tabela que suporta [id]
      const tablesWithPathId = [
        "users",
        "profiles",
        "projects",
        "teams",
        "sites",
        "companies",
        "construction_documents",
      ];
      const usePathId =
        id && method !== "POST" && tablesWithPathId.includes(activeTable);

      const endpoint = usePathId ? `/${activeTable}/${id}` : `/${activeTable}`;
      console.log("[OrionClient] Final Endpoint:", endpoint);

      if (method === "PATCH" && !id) {
        console.warn(
          "[ORION API] Global updates without ID might not be supported",
        );
      }

      const result = await this.request(
        endpoint,
        method,
        body,
        method === "GET" || method === "DELETE"
          ? buildQueryParams()
          : undefined,
      );

      // Aplicar ordenação localmente se necessário
      if (result.data && Array.isArray(result.data) && orderBy) {
        result.data.sort((a, b) => {
          const aVal = a[orderBy.column];
          const bVal = b[orderBy.column];
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return orderBy.ascending ? comparison : -comparison;
        });
      }

      // Aplicar limit localmente se necessário
      if (result.data && Array.isArray(result.data) && limitCount) {
        result.data = result.data.slice(0, limitCount);
      }

      return result;
    };;

    const builder: QueryBuilder<T> = {
      select: (columns = "*") => {
        selectedColumns = columns;
        return builder;
      },
      insert: (data) => {
        method = "POST";
        body = data;
        return builder;
      },
      update: (data) => {
        method = "PUT"; // ORION Backend bypass: Use PUT instead of PATCH
        body = data;
        return builder;
      },
      upsert: (data) => {
        method = "POST"; // upsert is complex, we try POST first. If backend supports upsert on POST, great.
        body = data;
        return builder;
      },
      delete: () => {
        method = "DELETE";
        return builder;
      },
      eq: (column, value) => {
        console.log(`[ORION DEBUG] Adding filter eq: ${column}=${value}`);
        filters.push({ column, op: "eq", value });
        return builder;
      },
      neq: (column, value) => {
        filters.push({ column, op: "neq", value });
        return builder;
      },
      is: (column, value) => {
        filters.push({ column, op: "is", value });
        return builder;
      },
      in: (column, values) => {
        filters.push({ column, op: "in", value: values.join(",") });
        return builder;
      },
      order: (column, options = { ascending: true }) => {
        orderBy = { column, ascending: options.ascending ?? true };
        return builder;
      },
      limit: (count) => {
        limitCount = count;
        return builder;
      },
      single: async () => {
        const result = await execute();
        if (result.error) return result;
        const data = Array.isArray(result.data) ? result.data[0] : result.data;
        if (!data)
          return { data: null, error: { message: "Not found", code: "404" } };
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
        // Garantir que retorne array para chamadas .then() padrão (listas)
        const arrayData = Array.isArray(result.data)
          ? result.data
          : result.data
            ? [result.data]
            : [];
        resolve({ ...result, data: arrayData });
      },
    };

    return builder;
  }

  /**
   * RPC compatível com Next.js Server Actions ou API Routes separadas
   */
  async rpc<T = any>(
    functionName: string,
    params?: Record<string, any>,
  ): Promise<ApiResponse<T>> {
    // Mapeamento automático de parâmetros para padrão ORION Backend
    const mappedParams: Record<string, any> = { ...params };

    if (params?.p_identifier) mappedParams.identifier = params.p_identifier;
    if (params?.p_matricula) mappedParams.identifier = params.p_matricula;
    if (params?.p_senha) mappedParams.password = params.p_senha;

    // Se for resolve_login_identifier, retornamos um mock se o backend falhar,
    // mas tentamos o backend primeiro
    const result = await this.request<T>(
      `/rpc/${functionName}`,
      "POST",
      mappedParams,
    );

    return result;

    return result;
  }

  auth = {
    signInWithPassword: async (credentials: {
      email: string;
      password: string;
    }) => {
      const result = await this.request<{
        user: any;
        token: string;
        access_token: string;
      }>("/auth/login", "POST", credentials);

      const token = result.data?.access_token || result.data?.token;

      if (token && result.data?.user) {
        const user = {
          id: result.data.user.id || result.data.user.userId,
          email: result.data.user.email || credentials.email,
          ...result.data.user,
        };

        const session = {
          access_token: token,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "local-mock-refresh",
          user: user,
        };

        this.setToken(token, session);

        return {
          data: { user, session },
          error: null,
        };
      }

      return {
        data: { user: null, session: null },
        error: result.error,
      };
    },
    // Alias para compatibilidade ou uso interno
    signIn: async (credentials: { email: string; password: string }) => {
      return this.auth.signInWithPassword(credentials);
    },
    signUp: async (credentials: {
      email: string;
      password: string;
      options?: any;
    }) => {
      const result = await this.request<{ user: any }>(
        "/auth/register",
        "POST",
        {
          email: credentials.email,
          password: credentials.password,
          ...credentials.options?.data,
        },
      );
      return {
        data: { user: result.data?.user || null, session: null },
        error: result.error,
      };
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
      const res = await this.request<any>("/auth/session", "GET"); // Endpoint padrão NextAuth session
      // Formatar mock de sessão se tiver dados de usuário
      const sessionData = res.data?.user || res.data;
      const session =
        sessionData &&
          Object.keys(sessionData).length > 0 &&
          (sessionData.id || sessionData.userId)
          ? {
            access_token: this.token,
            token_type: "bearer",
            expires_in: 3600,
            refresh_token: "local-mock-refresh",
            user: sessionData,
          }
          : null;
      return { data: { session }, error: res.error };
    },
    setSession: async (session: {
      access_token: string;
      refresh_token: string;
    }) => {
      if (session.access_token) {
        this.setToken(session.access_token);
        // Mock de sessão para retorno
        const mockSession = {
          access_token: session.access_token,
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: session.refresh_token,
          user: null, // Será carregado via getUser ou já presente no payload se o backend enviar
        };
        return { data: { session: mockSession, user: null }, error: null };
      }
      return {
        data: { session: null, user: null },
        error: { message: "Invalid session" },
      };
    },
    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      this.authListeners.push(callback);

      // Inicializar com estado atual
      this.auth.getSession().then((res) => {
        if (res.data?.session) {
          callback("INITIAL_SESSION", res.data.session);
        }
      });

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authListeners = this.authListeners.filter(
                (l) => l !== callback,
              );
            },
          },
        },
      };
    },
    resetPasswordForEmail: async (email: string, options?: any) => {
      console.warn(
        "[ORION API] resetPasswordForEmail fallback in local backend",
      );
      const result = await this.request("/auth/reset-password", "POST", {
        email,
        ...options,
      });
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
        // A URL pública agora aponta para o endpoint da API especificado pelo bucket
        const endpoint = bucket === "photos" ? "photos" : "documents";
        return {
          data: {
            publicUrl: `${this.baseUrl}/storage/${endpoint}?path=${path}`,
          },
        };
      },
      upload: async (path: string, file: File) => {
        const endpoint = bucket === "photos" ? "photos" : "documents";
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", path); // Passamos o path sugerido como metadado se necessário
        return this.request(`/storage/${endpoint}`, "POST", formData);
      },
      download: async (path: string) => {
        const endpoint = bucket === "photos" ? "photos" : "documents";
        const url = `${this.baseUrl}/storage/${endpoint}?path=${path}`;
        const response = await fetch(url, {
          headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        });
        if (!response.ok) throw new Error("Download failed");
        const blob = await response.blob();
        return { data: blob, error: null };
      },
      createSignedUrl: async (path: string, expiresIn: number) => {
        // Simplificação: no backend local, a URL pública já serve como "assinada" por enquanto
        const endpoint = bucket === "photos" ? "photos" : "documents";
        return {
          data: {
            signedUrl: `${this.baseUrl}/storage/${endpoint}?path=${path}`,
          },
          error: null,
        };
      },
      remove: async (paths: string[]) => {
        // TODO: Implementar DELETE no backend storage se necessário
        console.warn("[ORION STORAGE] Remove not yet implemented in backend");
        return { error: null };
      },
    }),
  };
}

export const orionApi = new OrionApiClient(API_URL);
export const localApi = orionApi;

