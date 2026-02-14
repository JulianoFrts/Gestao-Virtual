/**
 * Unified Database Client
 * 
 * Exporta o cliente local ORION (Next.js 14+ / Prisma).
 * A integração com db foi removida.
 * 
 * Uso: import { db } from '@/integrations/database';
 */

import { orionApi } from '../orion/client';

// Força o uso do Orion API local
export const db = orionApi as any;

// Exporta o modo atual como sempre local para compatibilidade
export const isLocalMode = true;

// Re-exporta o cliente principal
export { orionApi };

// Tipo para compatibilidade
export type DatabaseClient = typeof orionApi;

