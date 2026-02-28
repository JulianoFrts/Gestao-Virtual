import Dexie, { type Table } from 'dexie';

export interface StorageItem {
    key: string;
    value: any;
    updatedAt: number;
}

export interface SyncItem {
    id?: number;
    operation: 'insert' | 'update' | 'delete';
    table: string;
    data: any;
    itemId?: string;
    timestamp: number;
}

// Nova interface para metadados de cache
export interface CacheMetadata {
    key: string;           // Chave única do cache (ex: 'cache:employees')
    tableName: string;     // Nome da tabela/entidade
    createdAt: number;     // Timestamp de criação
    expiresAt: number;     // Timestamp de expiração (TTL)
    recordCount: number;   // Quantidade de registros cacheados
    version: number;       // Versão do cache para invalidação
}

// TTL padrão por tipo de entidade (em milissegundos)
export const CACHE_TTL = {
    employees: 24 * 60 * 60 * 1000,      // 24 horas
    teams: 24 * 60 * 60 * 1000,          // 24 horas
    jobFunctions: 7 * 24 * 60 * 60 * 1000, // 7 dias
    sites: 24 * 60 * 60 * 1000,          // 24 horas
    projects: 24 * 60 * 60 * 1000,       // 24 horas
    companies: 7 * 24 * 60 * 60 * 1000,  // 7 dias
    timeRecords: 6 * 60 * 60 * 1000,     // 6 horas
    dailyReports: 6 * 60 * 60 * 1000,    // 6 horas
    messages: 1 * 60 * 60 * 1000,        // 1 hora
    constructionDocuments: 24 * 60 * 60 * 1000, // 24 horas
    mapElements: 24 * 60 * 60 * 1000,           // 24 horas
    towerTechnicalData: 7 * 24 * 60 * 60 * 1000 // 7 dias
} as const;

export type CacheableEntity = keyof typeof CACHE_TTL;

export class TeamTrackDB extends Dexie {
    storage!: Table<StorageItem>;
    syncQueue!: Table<SyncItem>;
    cacheKeys!: Table<CacheMetadata>;

    constructor() {
        super('TeamTrackDB');

        // Versão 1: storage e syncQueue originais
        this.version(1).stores({
            storage: 'key',
            syncQueue: '++id, table, operation, timestamp'
        });

        // Versão 2: Adiciona tabela cacheKeys para metadados
        this.version(2).stores({
            storage: 'key',
            syncQueue: '++id, table, operation, timestamp',
            cacheKeys: 'key, tableName, expiresAt'
        });
    }
}

export const db = new TeamTrackDB();

// Garantir que o banco esteja aberto com tratamento de erro de permissão
const openDB = async () => {
    try {
        if (!db.isOpen()) {
            await db.open();
            console.log('[ORION DB] Banco de dados conectado com sucesso.');
        }
    } catch (err: any) {
        console.error('Failed to open IndexedDB:', err);
        if (err.name === 'SecurityError' || err.name === 'UnknownError') {
            console.warn('[ORION DB] Acesso ao banco negado pelo navegador. Verifique se cookies de terceiros estão bloqueados ou se está em modo incógnito restritivo.');
        }
    }
};

openDB();

// Interceptor global para erros do Dexie para tentar reabrir o banco se fechar
db.on('close', () => {
    console.warn('[ORION DB] Conexão com IndexedDB fechada. Tentando reconectar...');
    setTimeout(() => openDB(), 1000);
});
