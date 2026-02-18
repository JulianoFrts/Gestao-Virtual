import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const getBaseUrl = () => {
  const url = (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
    (globalThis as any).importMetaEnv?.VITE_API_URL ||
    "";
  
  // Strip /api/v1 suffix if present to avoid duplication with generated code
  return url.replace(/\/api\/v1\/?$/, '');
};

// Instância base do Axios para o Orion
export const AXIOS_INSTANCE = axios.create({
  baseURL: getBaseUrl(),
});

// Interceptador para adicionar token de autenticação
AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('orion_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('next-auth.session-token');

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Mutator para o Orval
export const orionClient = <T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig
): Promise<T> => {
  const source = axios.CancelToken.source();
  const promise = AXIOS_INSTANCE({
    ...config,
    ...options,
    cancelToken: source.token,
  }).then(({ data }: AxiosResponse<T>) => data);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  promise.cancel = () => {
    source.cancel("Query was cancelled");
  };

  return promise;
};

export default orionClient;
