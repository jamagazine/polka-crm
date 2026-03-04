export interface WarehouseItem {
    _id: string;
    isFolder: boolean;
    parentId: string; // Заменено string | null на string
    name: string;
    code: string; // Изменено
    article: string; // Изменено
    barcode: string; // Изменено
    stock: number;
    price: number | null;
    category?: string;       // Новое поле: Категория из скобок
    totalValue?: number;     // Новое поле: stock * price
    cost?: number;           // себестоимость товара
    purchase?: number;
    purchasePrice?: number;

    image?: string | null;
    picture?: string | null;
    pic?: string[];

    // Метрики-детекторы
    minusesCount?: number;     // Кол-во товаров со стоком < 0
    moneyIssuesCount?: number; // Кол-во товаров с ценой <= 0 или себестоимостью <= 0
    zeroStockCount?: number;   // Кол-во товаров со стоком === 0
    multiIssuesCount?: number; // Кол-во товаров с 2+ проблемами
    salesCount?: number;       // Количество продаж товара

    // Вспомогательные поля
    isSystem?: boolean;
    isArchived?: boolean;
    hasSubfolders?: boolean;
    subFoldersCount?: number;
    subItemsCount?: number;

    // Агрегированные поля для папок
    recursiveItemsCount?: number;
    totalStock?: number;
    skuCount?: number;
}

const EXCLUDED_CATEGORY_TERMS = ['Архив', 'Пустая', 'Товары без папки'];

/** Мягкая валидация обязательных полей перед записью в БД */
function validateItem(item: any): boolean {
    if (!item) return false;
    const id = item._id || item.id || item.uuid || item.uid;
    if (!id || typeof id !== 'string' || id.trim() === '') {
        try {
            const { appLog } = require('../hooks/useAppLogger');
            appLog(`[VALIDATION] Пропущен товар без ID: ${item.name || '(без имени)'}`, 'warn');
        } catch { /* silent */ }
        return false;
    }
    if (!item.name || typeof item.name !== 'string' || item.name.trim() === '') {
        try {
            const { appLog } = require('../hooks/useAppLogger');
            appLog(`[VALIDATION] Пропущен товар без имени: ID=${id}`, 'warn');
        } catch { /* silent */ }
        return false;
    }
    return true;
}

export function parseCatalogItem(rawItem: any): WarehouseItem | null {
    if (!rawItem || !validateItem(rawItem)) return null;
    const finalId = rawItem._id || rawItem.id || rawItem.uuid || rawItem.uid;
    if (!finalId) return null;
    let name = rawItem.name || '';

    // Метка Архива
    const isArchived = name.includes('(Архив)');

    // Извлечение категории из круглых скобок (работает и для товаров, и для папок)
    let category = '';
    const categoryRegex = /\(([^)]+)\)/g;
    let categoryMatch;
    while ((categoryMatch = categoryRegex.exec(name)) !== null) {
        const potentialCategory = categoryMatch[1].trim();
        // Игнорируем технические слова (слова-исключения)
        const isExcluded = EXCLUDED_CATEGORY_TERMS.some(term => potentialCategory.includes(term));
        if (!isExcluded) {
            category = potentialCategory;
            break; // Берем первую подходящую категорию
        }
    }

    // Технические папки / товары (если применимо)
    const isSystem = name.startsWith('Яя `(');

    // Для склада оставляем имя 1:1 как в API (по просьбе пользователя)
    const cleanName = name;

    // Сначала берём id_group (даже если он 0!), и только если его совсем нет — _parent
    let pRaw = (rawItem.id_group !== undefined && rawItem.id_group !== null)
        ? rawItem.id_group
        : (rawItem._parent ?? "");
    let pStr = String(pRaw).trim();
    if (pStr === '' || pStr === '0' || pStr === 'null' || pStr === 'undefined' || pStr === 'false') {
        pStr = "";
    }

    let stock = 0;
    if (rawItem.total_stock !== undefined) {
        stock = Number(rawItem.total_stock) || 0;
    } else if (rawItem.stock && typeof rawItem.stock === 'object') {
        stock = Object.values(rawItem.stock).reduce((a: number, b: any) => a + (Number(b) || 0), 0);
    } else {
        stock = Number(rawItem.stock) || 0;
    }
    const price = rawItem.price ? parseFloat(rawItem.price) : 0; // fallback to 0 instead of null for easier math
    const cost = rawItem.buy_price ? parseFloat(rawItem.buy_price) : 0;
    const purchase = rawItem.purchase ? parseFloat(rawItem.purchase) : 0;
    const purchasePrice = rawItem.purchasePrice ? parseFloat(rawItem.purchasePrice) : 0;
    const totalValue = stock * price;

    // Детекторы базовые (для товаров)
    const isProduct = rawItem.type !== 'group';
    const minusesCount = isProduct && stock < 0 ? 1 : 0;

    // Исправление для status/moneyIssuesCount: используем все возможные варианты закупа
    const effectivePurchase = purchase || cost || purchasePrice || 0;
    const moneyIssuesCount = isProduct && (price <= 0 || effectivePurchase <= 0) ? 1 : 0;

    const zeroStockCount = isProduct && stock === 0 ? 1 : 0;

    const issuesCount = minusesCount + moneyIssuesCount + zeroStockCount;
    const multiIssuesCount = isProduct && issuesCount >= 2 ? 1 : 0;

    return {
        _id: String(finalId),
        isFolder: rawItem.type === 'group',
        parentId: pStr,
        name: rawItem.name ? String(rawItem.name).trim() : "Без названия",
        code: rawItem.code ? String(rawItem.code) : "",
        article: rawItem.sku ? String(rawItem.sku) : "",
        barcode: rawItem.barcode ? String(rawItem.barcode) : "",
        stock,
        price,
        cost,
        purchase,
        purchasePrice,
        category,
        totalValue,
        minusesCount,
        moneyIssuesCount,
        zeroStockCount,
        multiIssuesCount,
        isSystem,
        isArchived,
        image: rawItem.image || null,
        picture: rawItem.picture || null,
        pic: Array.isArray(rawItem.pic) ? rawItem.pic : undefined
    };
}

/**
 * Обогащает массив WarehouseItem: для папок рекурсивно считает
 * totalStock, totalValue, skuCount, minusesCount, moneyIssuesCount,
 * zeroStockCount, multiIssuesCount, hasSubfolders, subFoldersCount и т.д.
 *
 * Применяется и после загрузки из кэша, и после синхронизации с API.
 */
export function enrichWarehouseData(items: WarehouseItem[]): WarehouseItem[] {
    // 1. Строим карту «parentId → дочерние элементы»
    const folderChildren = new Map<string, WarehouseItem[]>();

    for (const item of items) {
        if (item.parentId) {
            const children = folderChildren.get(item.parentId) || [];
            children.push(item);
            folderChildren.set(item.parentId, children);
        }
    }

    // 2. Рекурсивный подсчёт статистики с мемоизацией
    type FolderStats = {
        totalStock: number;
        totalValue: number;
        skuCount: number;
        minusesCount: number;
        moneyIssuesCount: number;
        zeroStockCount: number;
        multiIssuesCount: number;
    };

    const memo = new Map<string, FolderStats>();

    function getRecursiveStats(folderId: string): FolderStats {
        if (memo.has(folderId)) return memo.get(folderId)!;

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
                skuCount += 1;
                minusesCount += child.minusesCount || 0;
                moneyIssuesCount += child.moneyIssuesCount || 0;
                zeroStockCount += child.zeroStockCount || 0;
                multiIssuesCount += child.multiIssuesCount || 0;
            }
        }

        const result = { totalStock, totalValue, skuCount, minusesCount, moneyIssuesCount, zeroStockCount, multiIssuesCount };
        memo.set(folderId, result);
        return result;
    }

    // 3. Обогащаем папки агрегированными данными
    const enriched = items.map(item => {
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
                multiIssuesCount: stats.multiIssuesCount,
            };
        }
        return item;
    });

    // 4. Сортировка: папки сверху, затем по имени
    return enriched.sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        return (a.name || '').localeCompare(b.name || '', 'ru', { sensitivity: 'base' });
    });
}
