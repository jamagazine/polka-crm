import { type RawCatalogItem } from '../../api/client';
import { parseCatalogItem, type WarehouseItem } from '../../utils/parseCatalog';
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
                    const sortedCached = cachedCatalog.sort((a: WarehouseItem, b: WarehouseItem) => {
                        if (a.isFolder && !b.isFolder) return -1;
                        if (!a.isFolder && b.isFolder) return 1;
                        return (a.name || '').localeCompare(b.name || '', 'ru', { sensitivity: 'base' });
                    });
                    set(() => ({ catalog: sortedCached }));
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
            const rawCatalog: RawCatalogItem[] = await catalogService.syncCatalog((offset) => {
                globalSet(() => ({ parseProgress: `Загрузка: ${offset}...` }));
            });
            // 1. Парсим
            const parsedItems = rawCatalog.map(parseCatalogItem);

            // 2. Считаем вложенность и обогащаем
            const folderChildren = new Map<string, WarehouseItem[]>();

            for (const item of parsedItems) {
                if (item.parentId) {
                    const children = folderChildren.get(item.parentId) || [];
                    children.push(item);
                    folderChildren.set(item.parentId, children);
                }
            }

            const memoRecursiveStats = new Map<string, { totalStock: number, totalValue: number, skuCount: number, minusesCount: number, moneyIssuesCount: number, zeroStockCount: number, multiIssuesCount: number }>();

            function getRecursiveStats(folderId: string): { totalStock: number, totalValue: number, skuCount: number, minusesCount: number, moneyIssuesCount: number, zeroStockCount: number, multiIssuesCount: number } {
                if (memoRecursiveStats.has(folderId)) return memoRecursiveStats.get(folderId)!;
                let totalStock = 0;
                let totalValue = 0;
                let skuCount = 0;
                let minusesCount = 0;
                let moneyIssuesCount = 0;
                let zeroStockCount = 0;
                let multiIssuesCount = 0;

                const children = folderChildren.get(folderId) || [];
                for (const child of children) {
                    if (child.isFolder) {
                        const stats = getRecursiveStats(child._id);
                        totalStock += stats.totalStock;
                        totalValue += stats.totalValue;
                        skuCount += stats.skuCount;
                        minusesCount += stats.minusesCount;
                        moneyIssuesCount += stats.moneyIssuesCount;
                        zeroStockCount += stats.zeroStockCount;
                        multiIssuesCount += stats.multiIssuesCount;
                    } else {
                        totalStock += child.stock || 0;
                        totalValue += child.totalValue || 0;
                        skuCount += 1; // Уникальная карточка товара
                        minusesCount += child.minusesCount || 0;
                        moneyIssuesCount += child.moneyIssuesCount || 0;
                        zeroStockCount += child.zeroStockCount || 0;
                        multiIssuesCount += child.multiIssuesCount || 0;
                    }
                }
                const result = { totalStock, totalValue, skuCount, minusesCount, moneyIssuesCount, zeroStockCount, multiIssuesCount };
                memoRecursiveStats.set(folderId, result);
                return result;
            }

            const enrichedCatalog = parsedItems.map(item => {
                if (item.isFolder) {
                    const children = folderChildren.get(item._id) || [];
                    const directFolders = children.filter(c => c.isFolder).length;
                    const directItems = children.filter(c => !c.isFolder).length;
                    const stats = getRecursiveStats(item._id);

                    return {
                        ...item,
                        hasSubfolders: directFolders > 0,
                        subFoldersCount: directFolders,
                        subItemsCount: directItems,
                        recursiveItemsCount: stats.skuCount,
                        totalStock: stats.totalStock,
                        totalValue: stats.totalValue,
                        skuCount: stats.skuCount,
                        minusesCount: stats.minusesCount,
                        moneyIssuesCount: stats.moneyIssuesCount,
                        zeroStockCount: stats.zeroStockCount,
                        multiIssuesCount: stats.multiIssuesCount
                    };
                }
                return item;
            });

            const finalCatalog = enrichedCatalog
                .sort((a, b) => {
                    if (a.isFolder && !b.isFolder) return -1;
                    if (!a.isFolder && b.isFolder) return 1;
                    return (a.name || '').localeCompare(b.name || '', 'ru', { sensitivity: 'base' });
                });

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
