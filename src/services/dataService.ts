import { db } from '../core/db/database';
import { fetchMasters, fetchAllCatalog, type Master, type RawCatalogItem } from '../api/client';
import { log } from '../utils/logger';

/**
 * Сервис для работы с данными (Мастера и Каталог).
 * Изолирует работу с API и IndexedDB.
 */

export const mastersService = {
    /**
     * Получить список мастеров (из БД или API с принудительным обновлением)
     */
    async getMasters(forceRefresh = false): Promise<Master[]> {
        if (!forceRefresh) {
            const cached = await db.masters.toArray();
            if (cached.length > 0) return cached;
        }

        const fresh = await fetchMasters();
        if (fresh.length > 0) {
            await db.masters.clear();
            await db.masters.bulkAdd(fresh);
        }
        return fresh;
    },

    /**
     * Сохранить одного мастера (с генерацией UUID если нет ID)
     */
    async saveMaster(master: Partial<Master>): Promise<string> {
        const id = master._id || crypto.randomUUID();
        const doc = { ...master, _id: id } as Master;
        await db.masters.put(doc);
        return id;
    },

    /**
     * Удалить мастера
     */
    async deleteMaster(id: string): Promise<void> {
        await db.masters.delete(id);
    }
};

export const catalogService = {
    /**
     * Получить весь каталог (из БД)
     */
    async getCatalog(): Promise<any[]> {
        return await db.catalog.toArray();
    },

    /**
     * Синхронизация каталога из API
     */
    async syncCatalog(onProgress?: (offset: number) => void): Promise<any[]> {
        const fresh = await fetchAllCatalog(onProgress);
        if (fresh.length > 0) {
            await db.catalog.clear();
            // Преобразуем RawCatalogItem в WarehouseItem если нужно, 
            // но пока просто сохраняем как есть (или как ожидает БД)
            await db.catalog.bulkAdd(fresh as any);
        }
        return fresh;
    },

    /**
     * Сохранить товар
     */
    async saveProduct(item: any): Promise<string> {
        const id = item._id || crypto.randomUUID();
        await db.catalog.put({ ...item, _id: id });
        return id;
    }
};
