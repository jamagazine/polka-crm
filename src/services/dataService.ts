import { db } from '../core/db/database';
import { fetchMasters, fetchAllCatalog, type Master, type RawCatalogItem } from '../api/client';
import { parseCatalogItem } from '../utils/parseCatalog';
import { log } from '../utils/logger';
import { appLog } from '../hooks/useAppLogger';

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
            if (cached.length > 0) {
                appLog(`[MASTERS] Загружено из кэша: ${cached.length}`, 'info');
                return cached;
            }
        }

        appLog('[MASTERS] Запрос данных из API...', 'info');
        const fresh = await fetchMasters();
        if (fresh.length > 0) {
            await db.masters.clear();
            await db.masters.bulkAdd(fresh);
            appLog(`[MASTERS] Синхронизировано: ${fresh.length} мастеров`, 'success');
            localStorage.setItem('last_sync_masters', Date.now().toString());
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
     * Синхронизация каталога из API с интеллектуальным сравнением
     */
    async syncCatalog(onProgress?: (offset: number) => void): Promise<any[]> {
        appLog('[SYNC] Синхронизация запущена...', 'info');
        const fresh = await fetchAllCatalog(onProgress);
        appLog(`[SYNC] Получено из CloudShop: ${fresh?.length} записей`, 'info');

        if (fresh.length > 0) {
            const parsed = fresh.map(parseCatalogItem).filter(Boolean) as any[];
            appLog(`[SYNC] После парсинга: ${parsed.length}`, 'info');

            const cleanItems = parsed.filter(i =>
                i &&
                typeof i._id === 'string' &&
                i._id.trim() !== '' &&
                i._id !== 'undefined' &&
                i._id !== 'null'
            );
            appLog(`[SYNC] Валидных для базы: ${cleanItems.length}`, 'info');

            try {
                // Интеллектуальное сравнение с существующими данными
                const existing = await db.catalog.toArray();
                const existingMap = new Map<string, string>();
                for (const item of existing) {
                    existingMap.set(item._id, JSON.stringify(item));
                }

                let newCount = 0;
                let updatedCount = 0;
                let unchangedCount = 0;

                for (const item of cleanItems) {
                    const existingJson = existingMap.get(item._id);
                    if (!existingJson) {
                        newCount++;
                    } else if (existingJson !== JSON.stringify(item)) {
                        updatedCount++;
                    } else {
                        unchangedCount++;
                    }
                }

                // Атомарная перезапись: clear + bulkAdd только если есть что записать
                if (cleanItems.length > 0) {
                    await db.catalog.clear();
                    await db.catalog.bulkAdd(cleanItems);
                    appLog(`[SYNC] Готово: +${newCount} новых, ~${updatedCount} обновлено, ${unchangedCount} без изменений`, 'success');
                    localStorage.setItem('last_sync_catalog', Date.now().toString());
                } else {
                    appLog('[SYNC] Парсинг вернул 0 валидных записей — БД не тронута', 'warn');
                }

                return cleanItems;
            } catch (err) {
                appLog(`[SYNC] ОШИБКА БАЗЫ: ${err}`, 'error');
                return cleanItems;
            }
        }

        appLog('[SYNC] Нет данных из API', 'warn');
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

/** Возвращает время последней синхронизации в человекочитаемом формате */
export function getLastSyncInfo(): { catalog: string; masters: string } {
    const formatAgo = (key: string): string => {
        const raw = localStorage.getItem(key);
        if (!raw) return 'Нет данных';
        const ts = parseInt(raw, 10);
        if (isNaN(ts)) return 'Нет данных';

        const diff = Date.now() - ts;
        const seconds = Math.floor(diff / 1000);
        if (seconds < 60) return 'только что';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes} мин. назад`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ч. назад`;
        const days = Math.floor(hours / 24);
        return `${days} дн. назад`;
    };

    return {
        catalog: formatAgo('last_sync_catalog'),
        masters: formatAgo('last_sync_masters'),
    };
}
