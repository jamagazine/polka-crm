/* ─── Типы ─── */

import { type Master } from '../../api/client';
import { parseMasterData } from '../../utils/parseMaster';
import { mastersService, catalogService } from '../../services/dataService';

export { type Master };

export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export interface ColumnPreset {
    id: string;
    name: string;
    visibleColumns: string[];
    columnOrder: string[];
    isDefault?: boolean;
}

// Контекстные ключи пресетов
export type PresetPageKey = 'warehouse_folder' | 'warehouse_item' | 'masters';

// Системные колонки, которые нельзя скрыть
const PROTECTED_COLUMNS = ['index'];

const DEFAULT_PRESETS: Record<PresetPageKey, ColumnPreset[]> = {
    warehouse_item: [
        { id: 'item_commercial', name: 'Коммерческий анализ', visibleColumns: ['index', 'type', 'status', 'name', 'purchase', 'price', 'profit', 'margin', 'roi', 'sales'], columnOrder: ['index', 'type', 'status', 'name', 'purchase', 'price', 'profit', 'margin', 'roi', 'sales'], isDefault: true },
        { id: 'item_full', name: 'Полная спецификация', visibleColumns: ['index', 'name', 'code', 'article', 'barcode', 'stock', 'purchase', 'price', 'profit', 'margin', 'roi', 'sales'], columnOrder: [], isDefault: true },
    ],
    warehouse_folder: [
        { id: 'folder_state', name: 'Состояние склада', visibleColumns: ['index', 'type', 'status', 'name', 'skuCount', 'stock', 'totalValue'], columnOrder: ['index', 'type', 'status', 'name', 'skuCount', 'stock', 'totalValue'], isDefault: true },
        { id: 'folder_audit', name: 'Технический аудит', visibleColumns: ['index', 'type', 'status', 'name', 'skuCount', 'zeroStockCount', 'minusesCount', 'moneyIssuesCount'], columnOrder: ['index', 'type', 'status', 'name', 'skuCount', 'zeroStockCount', 'minusesCount', 'moneyIssuesCount'], isDefault: true },
        { id: 'folder_full', name: 'Развернутый вид', visibleColumns: ['index', 'name', 'skuCount', 'stock', 'totalValue', 'zeroStockCount', 'minusesCount', 'moneyIssuesCount'], columnOrder: [], isDefault: true },
    ],
    masters: [
        { id: 'masters_profile', name: 'Профиль мастера', visibleColumns: ['index', 'type', 'status', 'name', 'category', 'city', 'date'], columnOrder: ['index', 'type', 'status', 'name', 'category', 'city', 'date'], isDefault: true },
        { id: 'masters_contacts', name: 'Контакты и Оплата', visibleColumns: ['index', 'type', 'status', 'name', 'phone', 'payment', 'bank', 'city'], columnOrder: ['index', 'type', 'status', 'name', 'phone', 'payment', 'bank', 'city'], isDefault: true },
        { id: 'masters_full', name: 'Максимальный отчет', visibleColumns: ['index', 'name', 'status', 'skuCount', 'totalValue', 'moneyIssuesCount', 'zeroStockCount', 'category', 'phone', 'payment', 'bank', 'city', 'date', 'notes'], columnOrder: [], isDefault: true },
    ],
};

export interface DataSlice {
    currentPage: number;
    totalPages: number;
    totalRows: number;
    pageSize: PageSize;
    isParsing: boolean;
    parseProgress: string;

    // ─── Мастера ───────────────────────────────────────────────────────────
    masters: Master[];
    isLoading: boolean;
    lastMastersSync: number | null;

    // ─── Выделение строк ────────────────────────────────────────────────────
    selectedIds: Set<string>;
    allFilteredIds: string[];
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    setSelection: (ids: Set<string>) => void;
    setAllFilteredIds: (ids: string[]) => void;
    baseFilteredIds: string[];
    setBaseFilteredIds: (ids: string[]) => void;
    selectAllFiltered: () => void;

    // ─── Подсветка из поиска (отдельно от чекбоксов) ─────────────────────────
    highlightedIds: Set<string>;
    setHighlightedIds: (ids: Set<string>) => void;
    clearHighlightedIds: () => void;

    // ─── Фильтры и отобрaжение ──────────────────────────────────────────────
    mastersFilter: 'all' | 'active' | 'archive';
    statusFilter: 'minus' | 'money' | 'stock' | 'multi' | null;
    seniorityFilter: 'newbie' | 'regular' | 'expert' | 'veteran' | null;
    showOnlySelected: boolean;
    hiddenColumns: Record<string, string[]>;

    // ─── Пресеты колонок ─────────────────────────────────────────────
    columnPresets: Record<string, ColumnPreset[]>;
    activePresetId: Record<string, string | null>;
    applyPreset: (presetPageKey: PresetPageKey, presetId: string) => void;
    savePreset: (presetPageKey: PresetPageKey, name: string, allColumns: string[]) => void;
    deletePreset: (presetPageKey: PresetPageKey, presetId: string) => void;

    // ─── Настройки страниц ───────────────────────────────────────────
    mastersPrefs: { showRawNames: boolean; showShortNames: boolean; wordWrap: boolean };
    warehousePrefs: { showRawNames: boolean; wordWrap: boolean; showShortNames?: boolean; warehouseView?: 'folders' | 'products' };
    productsPrefs: { showRawNames: boolean; wordWrap: boolean };

    mastersColumnOrder: string[];
    warehouseColumnOrder: string[];
    productsColumnOrder: string[];

    setMastersFilter: (filter: 'all' | 'active' | 'archive') => void;
    setStatusFilter: (filter: 'minus' | 'money' | 'stock' | 'multi' | null) => void;
    setSeniorityFilter: (filter: 'newbie' | 'regular' | 'expert' | 'veteran' | null) => void;
    setShowOnlySelected: (val: boolean) => void;
    toggleHiddenColumn: (page: string, colId: string) => void;
    updateMastersPrefs: (settings: Partial<DataSlice['mastersPrefs']>) => void;
    updateWarehousePrefs: (settings: Partial<DataSlice['warehousePrefs']>) => void;
    updateProductsPrefs: (settings: Partial<DataSlice['productsPrefs']>) => void;
    setColumnOrder: (page: 'masters' | 'warehouse' | 'products', order: string[]) => void;
    resetColumnOrder: (page?: 'masters' | 'warehouse' | 'products') => void;
    setCurrentPage: (page: number) => void;
    setTotalPages: (total: number) => void;
    setTotalRows: (rows: number) => void;
    /** При смене размера страницы сбрасывает currentPage → 1 и пересчитывает totalPages */
    setPageSize: (size: PageSize) => void;
    setIsParsing: (parsing: boolean) => void;
    setParseProgress: (msg: string) => void;

    // ─── Экспорт ──────────────────────────────────────────────────────────
    exportCurrentTable: (() => void) | null;
    setExportCallback: (fn: (() => void) | null) => void;

    loadMasters: (forceSync?: boolean) => Promise<void>;
}

/* ─── Фабрика слайса ─── */

export const createDataSlice = (
    set: (fn: (s: DataSlice) => Partial<DataSlice>) => void,
): DataSlice => ({
    currentPage: 1,
    totalPages: 1,
    totalRows: 0,
    pageSize: 25,
    isParsing: false,
    parseProgress: '',
    masters: [],
    isLoading: false,
    lastMastersSync: null,
    mastersFilter: 'active',
    statusFilter: null,
    seniorityFilter: null,
    showOnlySelected: false,
    hiddenColumns: { masters: [], warehouse_folders: [], warehouse_items: [], products: [] },

    // ─── Пресеты ─────────────────────────────────────────────────────
    columnPresets: {
        warehouse_item: [...DEFAULT_PRESETS.warehouse_item],
        warehouse_folder: [...DEFAULT_PRESETS.warehouse_folder],
        masters: [...DEFAULT_PRESETS.masters],
    },
    activePresetId: { warehouse_item: null, warehouse_folder: null, masters: null },

    mastersPrefs: { showRawNames: false, showShortNames: false, wordWrap: true },
    warehousePrefs: { showRawNames: false, wordWrap: true, showShortNames: false, warehouseView: 'folders' },
    productsPrefs: { showRawNames: false, wordWrap: true },

    mastersColumnOrder: [],
    warehouseColumnOrder: [],
    productsColumnOrder: [],

    selectedIds: new Set(),
    allFilteredIds: [],
    toggleSelection: (id) => set((s) => {
        const next = new Set(s.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedIds: next };
    }),
    clearSelection: () => set(() => ({ selectedIds: new Set() })),
    setSelection: (ids) => set(() => ({ selectedIds: ids })),
    setAllFilteredIds: (ids) => set(() => ({ allFilteredIds: ids })),
    baseFilteredIds: [],
    setBaseFilteredIds: (ids) => set(() => ({ baseFilteredIds: ids })),
    selectAllFiltered: () => set((s) => ({ selectedIds: new Set(s.allFilteredIds) })),

    highlightedIds: new Set(),
    setHighlightedIds: (ids) => set(() => ({ highlightedIds: ids })),
    clearHighlightedIds: () => set(() => ({ highlightedIds: new Set() })),

    setCurrentPage: (page) => set(() => ({ currentPage: page })),
    setTotalPages: (total) => set((s) => ({
        totalPages: total,
        currentPage: s.currentPage > total ? Math.max(1, total) : s.currentPage
    })),
    setTotalRows: (rows) => set(() => ({ totalRows: rows })),
    /** Меняет pageSize, сбрасывает страницу на 1, пересчитывает totalPages по текущему masters.length */
    setPageSize: (size) => set((s) => ({
        pageSize: size,
        currentPage: 1,
        totalPages: Math.ceil(s.totalRows / size) || 1,
    })),
    setIsParsing: (parsing) => set(() => ({ isParsing: parsing })),
    setParseProgress: (msg) => set(() => ({ parseProgress: msg })),

    exportCurrentTable: null,
    setExportCallback: (fn) => set(() => ({ exportCurrentTable: fn })),

    setMastersFilter: (filter) => set(() => ({ mastersFilter: filter, currentPage: 1 })),
    setStatusFilter: (filter) => set(() => ({ statusFilter: filter, currentPage: 1 })),
    setSeniorityFilter: (filter) => set(() => ({ seniorityFilter: filter, currentPage: 1 })),
    setShowOnlySelected: (val) => set(() => ({ showOnlySelected: val, currentPage: 1 })),
    toggleHiddenColumn: (page, colId) => set((s) => {
        // Защита системных колонок от скрытия
        if (PROTECTED_COLUMNS.includes(colId)) return {};
        const current = s.hiddenColumns[page] || [];
        const next = current.includes(colId)
            ? current.filter(c => c !== colId)
            : [...current, colId];
        // Сброс активного пресета при ручном изменении колонок
        const presetKey = page === 'warehouse_folders' ? 'warehouse_folder' : (page === 'warehouse_items' ? 'warehouse_item' : page);
        const newActivePresetId = { ...s.activePresetId };
        if (presetKey === 'warehouse_folder') { newActivePresetId['warehouse_folder'] = null; }
        else if (presetKey === 'warehouse_item') { newActivePresetId['warehouse_item'] = null; }
        else if (presetKey === 'masters') { newActivePresetId['masters'] = null; }
        else if (presetKey === 'products') { /* products doesn't have presets yet? */ }
        return { hiddenColumns: { ...s.hiddenColumns, [page]: next }, activePresetId: newActivePresetId };
    }),
    updateMastersPrefs: (settings) => set((s) => ({ mastersPrefs: { ...s.mastersPrefs, ...settings } })),
    updateWarehousePrefs: (settings) => set((s) => ({ warehousePrefs: { ...s.warehousePrefs, ...settings } })),
    updateProductsPrefs: (settings) => set((s) => ({ productsPrefs: { ...s.productsPrefs, ...settings } })),
    setColumnOrder: (page, order) => set((s) => {
        // Сброс активного пресета при ручном изменении порядка
        const newActivePresetId = { ...s.activePresetId };
        if (page === 'warehouse') { newActivePresetId['warehouse_folder'] = null; newActivePresetId['warehouse_item'] = null; }
        else if (page === 'masters') newActivePresetId['masters'] = null;
        if (page === 'masters') return { mastersColumnOrder: order, activePresetId: newActivePresetId };
        if (page === 'warehouse') return { warehouseColumnOrder: order, activePresetId: newActivePresetId };
        if (page === 'products') return { productsColumnOrder: order, activePresetId: newActivePresetId };
        return {};
    }),
    resetColumnOrder: (page) => set((s) => {
        if (page === 'masters') return {
            mastersColumnOrder: [],
            hiddenColumns: { ...s.hiddenColumns, masters: [] } as Record<string, string[]>,
            activePresetId: { ...s.activePresetId, masters: null } as Record<string, string | null>
        };
        if (page === 'warehouse') return {
            warehouseColumnOrder: [],
            hiddenColumns: { ...s.hiddenColumns, warehouse_folders: [], warehouse_items: [] } as Record<string, string[]>,
            activePresetId: { ...s.activePresetId, warehouse_folder: null, warehouse_item: null } as Record<string, string | null>
        };
        if (page === 'products') return {
            productsColumnOrder: [],
            hiddenColumns: { ...s.hiddenColumns, products: [] } as Record<string, string[]>
        };
        // If no page provided, reset all
        return {
            mastersColumnOrder: [], warehouseColumnOrder: [], productsColumnOrder: [],
            hiddenColumns: { masters: [], warehouse_folders: [], warehouse_items: [], products: [] } as Record<string, string[]>,
            activePresetId: { warehouse_item: null, warehouse_folder: null, masters: null } as Record<string, string | null>
        };
    }),

    // ─── Пресеты: экшены ─────────────────────────────────────────────
    applyPreset: (presetPageKey, presetId) => set((s) => {
        const presets = s.columnPresets[presetPageKey] || [];
        const preset = presets.find(p => p.id === presetId);
        if (!preset) return {};

        // Определяем ключ страницы для hiddenColumns
        const storePageKey = presetPageKey === 'masters' ? 'masters' : (presetPageKey === 'warehouse_item' ? 'warehouse_items' : 'warehouse_folders');
        const defaults = DEFAULT_PRESETS[presetPageKey];
        const allCols = defaults[defaults.length - 1].visibleColumns;
        // Скрытые = все минус видимые в пресете, НО исключая защищенные колонки
        const hidden = allCols.filter(c => !preset.visibleColumns.includes(c) && !PROTECTED_COLUMNS.includes(c));

        const orderKey = storePageKey === 'masters' ? 'mastersColumnOrder' : 'warehouseColumnOrder';

        return {
            hiddenColumns: { ...s.hiddenColumns, [storePageKey]: hidden },
            [orderKey]: preset.columnOrder.length > 0 ? preset.columnOrder : [],
            activePresetId: { ...s.activePresetId, [presetPageKey]: presetId },
        };
    }),

    savePreset: (presetPageKey, name, allColumns) => set((s) => {
        const storePageKey = presetPageKey === 'masters' ? 'masters' : (presetPageKey === 'warehouse_item' ? 'warehouse_items' : 'warehouse_folders');
        const orderKey = storePageKey === 'masters' ? 'mastersColumnOrder' : 'warehouseColumnOrder';
        const currentHidden = s.hiddenColumns[storePageKey] || [];
        const visibleColumns = allColumns.filter(c => !currentHidden.includes(c));
        const columnOrder = (s as any)[orderKey] || [];

        const newPreset: ColumnPreset = {
            id: `user_${Date.now()}`,
            name,
            visibleColumns,
            columnOrder,
        };

        const existing = s.columnPresets[presetPageKey] || [];
        return {
            columnPresets: { ...s.columnPresets, [presetPageKey]: [...existing, newPreset] },
            activePresetId: { ...s.activePresetId, [presetPageKey]: newPreset.id },
        };
    }),

    deletePreset: (presetPageKey, presetId) => set((s) => {
        const existing = s.columnPresets[presetPageKey] || [];
        const filtered = existing.filter(p => p.id !== presetId || p.isDefault);
        const newActive = s.activePresetId[presetPageKey] === presetId ? null : s.activePresetId[presetPageKey];
        return {
            columnPresets: { ...s.columnPresets, [presetPageKey]: filtered },
            activePresetId: { ...s.activePresetId, [presetPageKey]: newActive },
        };
    }),

    loadMasters: async (forceSync = false) => {
        set(() => ({ isLoading: true }));
        try {
            // Используем сервис для получения данных
            const list = await mastersService.getMasters(forceSync);

            // Обогащаем распарсенными полями и сортируем
            const processedMasters = list
                .map(m => ({ ...m, ...parseMasterData(m) }))
                .sort((a, b) => (a.sortKey || a.name || '').localeCompare(b.sortKey || b.name || '', 'ru', { sensitivity: 'base' }));

            set((s) => ({
                masters: processedMasters,
                totalRows: processedMasters.length,
                totalPages: Math.ceil(processedMasters.length / s.pageSize) || 1,
                currentPage: 1,
                lastMastersSync: forceSync ? Date.now() : s.lastMastersSync,
            }));
        } catch (err) {
            console.error('Ошибка при загрузке мастеров:', err);
        } finally {
            set(() => ({ isLoading: false }));
        }
    },
});
