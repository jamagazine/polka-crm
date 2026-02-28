export interface WarehouseItem {
    _id: string;
    isFolder: boolean;
    parentId: string | null;
    name: string;
    code: string | null;
    article: string | null;
    barcode: string | null;
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

export function parseCatalogItem(rawItem: any): WarehouseItem {
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
    const isSystem = name.includes('`');

    // Для склада оставляем имя 1:1 как в API (по просьбе пользователя)
    const cleanName = name;

    // При переносе в корень CloudShop может выставить id_group = "" или "0", но оставить старый _parent.
    // Если мы используем ||, то falsy значения (как "") проваливаются и мы ошибочно берем старый _parent.
    let parentId = rawItem.id_group;
    if (parentId === undefined || parentId === null) {
        parentId = rawItem._parent;
    }

    // В CloudShop корень иногда идет как пустая строка, '0' или null
    if (!parentId || String(parentId).trim() === '' || String(parentId).trim() === '0') {
        parentId = null;
    }

    const stock = rawItem.total_stock ? parseFloat(rawItem.total_stock) : 0;
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
        _id: rawItem._id,
        isFolder: rawItem.type === 'group',
        parentId,
        name: cleanName,
        code: rawItem.code || null,
        article: rawItem.sku || null,
        barcode: rawItem.barcode || null,
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
