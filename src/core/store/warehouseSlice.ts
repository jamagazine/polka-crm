import { type WarehouseItem, enrichWarehouseData } from '../../utils/parseCatalog';
import { catalogService } from '../../services/dataService';

export interface WarehouseSlice {
    catalog: WarehouseItem[];
    isCatalogLoading: boolean;
    lastCatalogSync: number | null;
    warehouseRootPage: number | string | undefined;
    setWarehouseRootPage: (page: number | string | undefined) => void;

    warehouseView: 'folders' | 'products';
    setWarehouseView: (view: 'folders' | 'products') => void;

    warehouseFolderId: string | null;
    setWarehouseFolderId: (id: string | null) => void;

    loadCatalog: (forceSync?: boolean) => Promise<void>;
}

export const createWarehouseSlice = (
    set: (fn: (s: WarehouseSlice) => Partial<WarehouseSlice>) => void,
): WarehouseSlice => ({
    catalog: [],
    isCatalogLoading: false,
    lastCatalogSync: null,
    warehouseRootPage: 1,
    setWarehouseRootPage: (page) => set(() => ({ warehouseRootPage: page })),

    warehouseView: 'folders',
    setWarehouseView: (view) => set((s: any) => ({
        warehouseView: view,
        warehousePrefs: { ...s.warehousePrefs, warehouseView: view }
    })),

    warehouseFolderId: null,
    setWarehouseFolderId: (id) => set(() => ({ warehouseFolderId: id })),

    loadCatalog: async (forceSync = false) => {
        const globalSet = set as unknown as (fn: (s: any) => any) => void;

        if (!forceSync) {
            globalSet(() => ({ isCatalogLoading: true }));
            try {
                const cachedCatalog = await catalogService.getCatalog();
                if (cachedCatalog.length > 0) {
                    // Обогащаем данные из кэша (папки получают totalStock, skuCount и т.д.)
                    const enrichedCached = enrichWarehouseData(cachedCatalog);
                    set(() => ({ catalog: enrichedCached }));
                    return;
                }
            } catch (err) {
                console.error('Ошибка чтения каталога из БД:', err);
            } finally {
                globalSet(() => ({ isCatalogLoading: false }));
            }
        }

        globalSet(() => ({ isCatalogLoading: true, isParsing: true, parseProgress: 'Инициализация...' }));
        try {
            // syncCatalog уже возвращает спарсенные WarehouseItem — НЕ парсим повторно!
            const parsedItems: WarehouseItem[] = await catalogService.syncCatalog((offset) => {
                globalSet(() => ({ parseProgress: `Загрузка: ${offset}...` }));
            }) as WarehouseItem[];

            // Обогащаем данные из API (папки получают totalStock, skuCount и т.д.)
            const finalCatalog = enrichWarehouseData(parsedItems);

            set(() => ({
                catalog: finalCatalog,
                lastCatalogSync: Date.now(),
            }));
        } catch (err) {
            console.error('Ошибка при синхронизации каталога из сети:', err);
        } finally {
            globalSet(() => ({ isCatalogLoading: false, isParsing: false, parseProgress: '' }));
        }
    },
});
