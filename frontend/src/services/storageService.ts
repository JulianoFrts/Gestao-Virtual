import { db } from './db';

// Local storage service with IndexedDB (Dexie) support
class StorageService {
  /**
   * Converte qualquer objeto para uma versão "segura" para IndexedDB.
   * Remove Signals, Funções, e garante que não há Proxies ou referências circulares.
   * É uma versão mais robusta que o simples JSON.parse(JSON.stringify).
   */
  private toSafeObject(obj: any): any {
    try {
      if (obj === null || obj === undefined) return obj;
      
      // Se for primitivo, retorna direto
      if (typeof obj !== 'object') return obj;

      // Se for um Signal do Preact (detectado pela estrutura interna ou presença de .value em contexto específico)
      // Nota: No runtime do Preact, signals têm propriedades internas como _version, peek(), etc.
      if (obj && typeof obj === 'object' && 'value' in obj && (typeof obj.peek === 'function' || obj._version !== undefined)) {
        return this.toSafeObject(obj.value);
      }

      // Preserve native Blobs and Files for offline storage
      if (typeof window !== 'undefined' && (obj instanceof Blob || obj instanceof File)) {
        return obj;
      }

      // Se for um objeto com toJSON (Data, etc), usa a serialização padrão
      if (typeof obj.toJSON === 'function') {
        return JSON.parse(JSON.stringify(obj));
      }

      // Arrays: processa recursivamente
      if (Array.isArray(obj)) {
        return obj.map(item => this.toSafeObject(item));
      }

      // Objetos planos: processa propriedades
      const safe: Record<string, any> = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        // Pula funções (não serializáveis em IndexedDB)
        if (typeof value === 'function') return;
        
        // Atribui valor processado recursivamente
        safe[key] = this.toSafeObject(value);
      });
      
      return safe;
    } catch (e) {
      // Fallback extremo: tenta o JSON simples, se falhar retorna um objeto de erro
      try {
        return JSON.parse(JSON.stringify(obj));
      } catch (inner) {
        console.error('[StorageService] Critical serialization failure:', inner);
        return { __error: 'Unserializable data', type: typeof obj };
      }
    }
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      // Blindagem robusta contra DataCloneError
      const safeValue = this.toSafeObject(value);
      
      await db.storage.put({
        key,
        value: safeValue,
        updatedAt: Date.now()
      });
    } catch (error) {
      console.error(`[StorageService] Error saving key "${key}" to IndexedDB:`, error);
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = await db.storage.get(key);
      if (!item) return null;
      return item.value as T;
    } catch (error) {
      console.error(`[StorageService] Error reading key "${key}" from IndexedDB:`, error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await db.storage.delete(key);
    } catch (error) {
      console.error(`[StorageService] Error removing key "${key}" from IndexedDB:`, error);
    }
  }

  async addToSyncQueue(item: any): Promise<void> {
    try {
      // Blindagem: Sanitiza o payload para evitar DataCloneError
      const safeData = item.data ? this.toSafeObject(item.data) : undefined;
      const safeId = item.id || item.itemId;

      await db.syncQueue.add({
        operation: item.operation || 'insert',
        table: item.table,
        data: safeData,
        itemId: typeof safeId === 'string' || typeof safeId === 'number' ? String(safeId) : undefined,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error(`[StorageService] Error adding table "${item.table}" to sync queue:`, error);
    }
  }

  async getSyncQueue(): Promise<any[]> {
    try {
      return await db.syncQueue.toArray();
    } catch (error) {
      console.error('[StorageService] Error reading sync queue:', error);
      return [];
    }
  }

  async removeFromSyncQueue(id: number): Promise<void> {
    try {
      await db.syncQueue.delete(id);
    } catch (error) {
      console.error(`[StorageService] Error removing item ${id} from sync queue:`, error);
    }
  }

  async clearSyncQueue(): Promise<void> {
    try {
      await db.syncQueue.clear();
    } catch (error) {
      console.error('[StorageService] Error clearing sync queue:', error);
    }
  }

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        db.storage.clear(),
        db.syncQueue.clear()
      ]);
    } catch (error) {
      console.error('[StorageService] Error clearing all local data:', error);
    }
  }
}

export const storageService = new StorageService();
