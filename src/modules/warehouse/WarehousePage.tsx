import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { RefreshCw, Package, ArrowLeft, Folder, FolderCog, ExternalLink, Activity, ChevronRight, FolderTree, CheckSquare, MinusSquare, Square, TriangleAlert, Check } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { useDebounce } from '../../hooks/useDebounce';
import { type WarehouseItem } from '../../utils/parseCatalog';
import { CSS } from '../../utils/cssVars';
import {
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../../components/ui/table';
import { Checkbox } from '../../components/ui/checkbox';
import { cn } from '../../components/ui/utils';
import { SmartTableHead, SmartTableCell, SmartColHeader, SortIcon, type SmartTableColDef, type SortDir } from '../../components/polka/SmartTable';
import { exportSmartTable } from '../../utils/exportToExcel';
import { VirtualSmartTable } from '../../components/ui/VirtualSmartTable';
import { type Master } from '../../api/client';

// ─── Константы КОЛОНОК ────────────────────────────────────────────────────────

type ColId = 'index' | 'type' | 'status' | 'name' | 'category' | 'skuCount' | 'stock' | 'totalValue' | 'minusesCount' | 'moneyIssuesCount' | 'zeroStockCount' | 'code' | 'article' | 'barcode' | 'purchase' | 'price' | 'profit' | 'margin' | 'roi' | 'sales';

interface ColDef extends SmartTableColDef {
    id: ColId;
    label: string | React.ReactNode;
    sortable: boolean;
    searchable: boolean;
    sticky?: boolean;
}

// Removed duplicate SortIcon and SmartColHeader

// ─── Главный компонент ────────────────────────────────────────────────────────

export function WarehousePage() {
    const {
        setRightFooterCards, activeRightCardId,
        setHeaderContext, clearHeaderContext,
        setTotalPages, setTotalRows, setCurrentPage,
        currentPage, pageSize, // 1. Получение стейта пагинации
        catalog, isParsing, loadCatalog,
        warehouseRootPage, setWarehouseRootPage, warehouseView, setWarehouseView,
        setWarehouseFolderId,
        selectedIds, toggleSelection, clearSelection, setSelection, setAllFilteredIds, setBaseFilteredIds,
        highlightedIds, clearHighlightedIds,
        warehousePrefs, warehouseColumnOrder, setColumnOrder,
        setExportCallback,
        statusFilter, showOnlySelected, hiddenColumns,
        masters, dateRange
    } = usePanelStore(useShallow(state => ({
        setRightFooterCards: state.setRightFooterCards,
        activeRightCardId: state.activeRightCardId,
        setHeaderContext: state.setHeaderContext,
        clearHeaderContext: state.clearHeaderContext,
        setTotalPages: state.setTotalPages,
        setTotalRows: state.setTotalRows,
        setCurrentPage: state.setCurrentPage,
        currentPage: state.currentPage,
        pageSize: state.pageSize,
        catalog: state.catalog,
        isParsing: state.isParsing,
        loadCatalog: state.loadCatalog,
        warehouseRootPage: state.warehouseRootPage,
        setWarehouseRootPage: state.setWarehouseRootPage,
        warehouseView: state.warehouseView,
        setWarehouseView: state.setWarehouseView,
        setWarehouseFolderId: state.setWarehouseFolderId,
        selectedIds: state.selectedIds,
        toggleSelection: state.toggleSelection,
        clearSelection: state.clearSelection,
        setSelection: state.setSelection,
        setAllFilteredIds: state.setAllFilteredIds,
        setBaseFilteredIds: state.setBaseFilteredIds,
        highlightedIds: state.highlightedIds,
        clearHighlightedIds: state.clearHighlightedIds,
        warehousePrefs: state.warehousePrefs,
        warehouseColumnOrder: state.warehouseColumnOrder as string[],
        setColumnOrder: state.setColumnOrder as (page: 'masters' | 'warehouse' | 'products', order: string[]) => void,
        setExportCallback: state.setExportCallback,
        statusFilter: state.statusFilter,
        showOnlySelected: state.showOnlySelected,
        hiddenColumns: state.hiddenColumns,
        masters: state.masters,
        dateRange: state.dateRange
    })));

    const { showRawNames: showWarehouseRawNames, wordWrap, showShortNames } = warehousePrefs;

    useEffect(() => {
        return () => clearSelection();
    }, [clearSelection]);

    // ── Локальный стейт ──
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [currentFolderName, setCurrentFolderName] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'tree' | 'flat'>('tree');

    const FOLDER_COLUMNS: ColDef[] = useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <Folder className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: warehousePrefs.warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Тип строки (Системный/Активный/Архив или Папка/Товар)'
        },
        {
            id: 'status', label: <Activity className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: warehousePrefs.warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Состояние (Стаж или Диагностика ошибок)'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            sticky: warehousePrefs.warehouseView !== 'products',
            width: showWarehouseRawNames ? 'w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'w-[200px]' : 'w-[350px]'),
            minWidth: showWarehouseRawNames ? 'min-w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'min-w-[200px]' : 'min-w-[350px]'),
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Наименование позиции'
        },
        { id: 'category', label: 'Категория', sortable: true, searchable: true, width: 'w-[200px]', minWidth: 'min-w-[200px]' },
        { id: 'skuCount', label: 'Позиций', sortable: true, searchable: false, width: 'w-[125px]', minWidth: 'min-w-[125px]', align: 'right', tooltip: 'Количество товарных позиций в папке' },
        { id: 'stock', label: 'Остаток', sortable: true, searchable: false, width: 'w-[140px]', minWidth: 'min-w-[140px]', align: 'right' },
        { id: 'totalValue', label: 'Сумма', sortable: true, searchable: false, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'right', tooltip: 'Общая сумма остатков в папке' },
        { id: 'zeroStockCount', label: '📦', sortable: true, searchable: false, width: 'w-[80px]', minWidth: 'min-w-[80px]', align: 'center', tooltip: 'Нулевые остатки' },
        { id: 'minusesCount', label: '📉', sortable: true, searchable: false, width: 'w-[80px]', minWidth: 'min-w-[80px]', align: 'center', tooltip: 'Минусовые остатки' },
        { id: 'moneyIssuesCount', label: '💸', sortable: true, searchable: false, width: 'w-[80px]', minWidth: 'min-w-[80px]', align: 'center', tooltip: 'Ошибки в ценах' }
    ], [showWarehouseRawNames, showShortNames, viewMode]);

    const PRODUCT_COLUMNS: ColDef[] = useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <Package className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: warehousePrefs.warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Фото товара'
        },
        {
            id: 'status', label: <span title="Движение" className="flex items-center justify-center w-full h-full"><Activity className="w-4 h-4 text-muted-foreground" /></span>, sortable: true, searchable: false,
            sticky: warehousePrefs.warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Движение или ошибки'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            sticky: warehousePrefs.warehouseView !== 'products',
            width: showWarehouseRawNames ? 'w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'w-[200px]' : 'w-[350px]'),
            minWidth: showWarehouseRawNames ? 'min-w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'min-w-[200px]' : 'min-w-[350px]'),
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Наименование позиции'
        },
        { id: 'code', label: 'Код', sortable: true, searchable: true, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'center', tooltip: 'Внутренний код CloudShop' },
        { id: 'article', label: 'Артикул', sortable: true, searchable: true, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'center', tooltip: 'Пользовательский артикул' },
        { id: 'barcode', label: 'Штрихкод', sortable: true, searchable: true, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'center', tooltip: 'Штрихкод товара' },
        { id: 'stock', label: 'Остаток', sortable: true, searchable: false, width: 'w-[110px]', minWidth: 'min-w-[110px]', align: 'right' },
        { id: 'purchase', label: 'Закуп (₽)', sortable: true, searchable: false, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'right', tooltip: 'Цена закупки' },
        { id: 'price', label: 'Цена (₽)', sortable: true, searchable: false, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'right', tooltip: 'Цена продажи' },
        { id: 'profit', label: 'Прибыль (₽)', sortable: true, searchable: false, width: 'w-[140px]', minWidth: 'min-w-[140px]', align: 'right', tooltip: 'Прибыль: Цена - Закуп' },
        { id: 'margin', label: 'Предел скидки', sortable: true, searchable: false, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'right', tooltip: 'Маржинальность: показывает вашу долю в итоговой цене. Это максимальный процент скидки, который вы можете дать, чтобы не сработать в убыток.' },
        { id: 'roi', label: 'Наценка %', sortable: true, searchable: false, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'right', tooltip: 'ROI (Окупаемость): показывает, сколько процентов прибыли вы получаете сверх суммы, которую выплачиваете мастеру.' },
        { id: 'sales', label: 'Продажи', sortable: true, searchable: false, width: 'w-[120px]', minWidth: 'min-w-[120px]', align: 'right', tooltip: 'Количество продаж' }
    ], [showWarehouseRawNames, showShortNames, viewMode]);

    const isProductView = viewMode === 'flat' || currentFolderId !== null;
    const baseColumns = isProductView ? PRODUCT_COLUMNS : FOLDER_COLUMNS;

    const activeColumns: ColDef[] = useMemo(() => {
        const storePageKey = isProductView ? 'warehouse_items' : 'warehouse_folders';
        const warehouseHidden = hiddenColumns?.[storePageKey] || [];
        const visibleBase = warehouseHidden.length > 0
            ? baseColumns.filter(c => c.id === 'index' || !warehouseHidden.includes(c.id))
            : baseColumns;

        let result: ColDef[];
        if (!warehouseColumnOrder || warehouseColumnOrder.length === 0) {
            result = visibleBase;
        } else {
            const ordered: ColDef[] = [];
            const baseMap = new Map(visibleBase.map(c => [c.id, c]));

            warehouseColumnOrder.forEach(id => {
                if (baseMap.has(id as ColId)) {
                    ordered.push(baseMap.get(id as ColId)!);
                    baseMap.delete(id as ColId);
                }
            });

            visibleBase.forEach(c => {
                if (baseMap.has(c.id)) {
                    ordered.push(c);
                }
            });
            result = ordered;
        }

        // Возвращаем результат без изменений, так как стили теперь прописаны жестко в ColDef
        return result;
    }, [baseColumns, warehouseColumnOrder, hiddenColumns]);

    const [sort, setSort] = useState<{ col: ColId; dir: SortDir } | null>({ col: 'name', dir: 'asc' });

    // Поиск
    const [activeSearchCol, setSearchCol] = useState<ColId | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const isBarcodeSearch = /^\d{8,}$/.test(searchTerm);
    const effectiveSearchTerm = (isBarcodeSearch ? searchTerm : debouncedSearchTerm).toLowerCase();

    // DND State
    const [draggedColId, setDraggedColId] = useState<string | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null);

    // ── Логика рендеринга ячеек (вынос из VirtualSmartTable) ──
    const getCellValue = useCallback((item: WarehouseItem, colId: string): any => {
        switch (colId) {
            case 'type': {
                if (item.isFolder) {
                    if (item.isSystem) {
                        return (
                            <div className="relative inline-flex items-center justify-center" title="Системная папка">
                                <FolderCog className="w-4 h-4 text-slate-400" />
                                {item.subFoldersCount ? (
                                    <span className="absolute -bottom-1.5 -right-3 text-[9px] font-medium text-gray-500 leading-none bg-white/90 rounded px-0.5 border border-transparent">
                                        {item.subFoldersCount}
                                    </span>
                                ) : null}
                            </div>
                        );
                    } else if (item.hasSubfolders) {
                        return (
                            <div className="relative inline-flex items-center justify-center" title={`Вложенных папок: ${item.subFoldersCount}`}>
                                <FolderTree className="w-4 h-4 text-indigo-500 fill-indigo-50" />
                                {item.subFoldersCount ? (
                                    <span className="absolute -bottom-1.5 -right-3 text-[9px] font-medium text-gray-500 leading-none bg-white/90 rounded px-0.5 border border-transparent">
                                        {item.subFoldersCount}
                                    </span>
                                ) : null}
                            </div>
                        );
                    } else {
                        return (
                            <div className="relative inline-flex items-center justify-center">
                                <Folder className="w-4 h-4 text-blue-500 fill-blue-50" />
                            </div>
                        );
                    }
                } else if (item.pic && item.pic.length > 0) {
                    return (
                        <img
                            src={item.pic[0]}
                            alt={item.name}
                            className={cn(
                                "object-cover rounded-md border bg-white",
                                wordWrap ? "w-12 h-12" : "w-8 h-8"
                            )}
                        />
                    );
                } else {
                    return <Package className="w-4 h-4 text-slate-500" />;
                }
            }

            case 'code':
            case 'article':
            case 'barcode':
                return (
                    <span className="text-sm text-muted-foreground tabular-nums truncate block w-full">
                        {item[colId as keyof WarehouseItem] || '—'}
                    </span>
                );

            case 'status': {
                const hasMinuses = isProductView && !item.isFolder
                    ? item.stock < 0
                    : (item.minusesCount ? item.minusesCount > 0 : false);
                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                const price = item.price || 0;
                const hasMoneyIssues = isProductView && !item.isFolder
                    ? (purchase <= 0 || price <= 0 || price <= purchase)
                    : (item.moneyIssuesCount ? item.moneyIssuesCount > 0 : false);
                const hasZeroes = isProductView && !item.isFolder
                    ? item.stock === 0
                    : (item.zeroStockCount ? item.zeroStockCount > 0 : false);

                const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);

                if (errorsCount === 0 && !item.isFolder) {
                    return <span title="Всё в порядке" className="cursor-help inline-flex items-center justify-center"><Check className="w-3.5 h-3.5 text-green-500/40" /></span>;
                }
                if (errorsCount > 1) {
                    const errorMessages: string[] = [];
                    if (hasMinuses) errorMessages.push("Отрицательный остаток");
                    if (hasMoneyIssues) errorMessages.push("Проблема с ценой/закупом");
                    if (hasZeroes) errorMessages.push("Нулевой остаток");
                    return <span title={`Множественные проблемы:\n- ${errorMessages.join('\n- ')}`} className="cursor-help inline-flex items-center justify-center text-sm"><TriangleAlert className="w-4 h-4 text-red-500" /></span>;
                }
                if (hasMinuses) return <span className="text-base leading-none cursor-help inline-flex items-center justify-center" title="Отрицательный остаток">📉</span>;
                if (hasMoneyIssues) return <span className="text-base leading-none cursor-help inline-flex items-center justify-center" title="Проблема с ценой/закупом">💸</span>;
                if (hasZeroes) return <span className="text-base leading-none cursor-help inline-flex items-center justify-center" title="Нулевой остаток">📦</span>;
                return null;
            }

            case 'name': {
                const rawName = getDisplayName(item);
                const cleanName = rawName.replace(/\([^)]+\)/g, '').replace(/\[[^\]]+\]/g, '').replace(/`.+?`/g, '').replace(/\|[^|]+\|/g, '').trim() || rawName;
                let displayName = item.isFolder ? (showWarehouseRawNames ? rawName : cleanName) : rawName;
                const cloudShopUrl = item.isFolder
                    ? null
                    : `https://web.cloudshop.ru/card/catalog/list/m/get/${item._id}`;
                return (
                    <div className="flex items-center gap-2 pr-2 min-w-0 justify-between w-full text-sm">
                        <span className={cn(
                            "flex-1 min-w-0",
                            item.isFolder && "text-blue-600 font-medium",
                            wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto custom-scrollbar" : "truncate"
                        )}>
                            {displayName}
                        </span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {!item.isFolder && cloudShopUrl && (
                                <a
                                    href={cloudShopUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="opacity-50 hover:opacity-100 text-blue-500 transition-opacity"
                                    title="Открыть карточку товара в CloudShop"
                                >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                            )}
                            {item.isFolder && <ChevronRight className="w-4 h-4 opacity-50 text-blue-500 transition-transform group-hover:translate-x-1" />}
                        </div>
                    </div>
                );
            }

            case 'skuCount': return (
                <span className="text-sm text-muted-foreground">
                    {item.isFolder ? (item.skuCount ?? 0) : '—'}
                </span>
            );

            case 'zeroStockCount': return item.zeroStockCount ? (
                <span className="text-sm text-gray-400 cursor-help" title="Товары с нулевым остатком">{item.zeroStockCount}</span>
            ) : null;

            case 'minusesCount': return item.minusesCount ? (
                <span className="text-sm text-red-500 cursor-help" title="Товары с отрицательным остатком">{item.minusesCount}</span>
            ) : null;

            case 'moneyIssuesCount': return item.moneyIssuesCount ? (
                <span className="text-sm text-red-500 cursor-help" title="Товары с нулевой ценой или стоимостью закупки">{item.moneyIssuesCount}</span>
            ) : null;

            case 'stock': {
                const stockVal = item.isFolder ? (item.totalStock ?? 0) : item.stock;
                return (
                    <span className={cn('text-sm', stockVal < 0 && 'text-red-500')}>
                        {stockVal || 0}
                    </span>
                );
            }

            case 'purchase':
            case 'price':
            case 'profit': {
                if (item.isFolder && colId === 'profit') return '—';
                let val = 0;
                if (colId === 'purchase') val = item.purchase || item.cost || item.purchasePrice || 0;
                else if (colId === 'price') val = item.price || 0;
                else {
                    const buy = item.purchase || item.cost || item.purchasePrice || 0;
                    val = (item.price || 0) - buy;
                }
                if (item.isFolder && colId !== 'profit') return '—';

                return (
                    <span className={cn('text-sm', colId === 'profit' && (val > 0 ? 'text-green-600' : val < 0 ? 'text-red-500' : ''))}>
                        {new Intl.NumberFormat('ru-RU').format(val)}
                    </span>
                );
            }

            case 'margin':
            case 'roi': {
                if (item.isFolder) return '—';
                const buy = item.purchase || item.cost || item.purchasePrice || 0;
                const profit = (item.price || 0) - buy;
                const percent = colId === 'margin'
                    ? (item.price ? (profit / item.price) * 100 : 0)
                    : (buy ? (profit / buy) * 100 : 0);

                return (
                    <span className={cn('text-sm', percent > 0 ? 'text-green-600' : percent < 0 ? 'text-red-500' : '')}>
                        {percent !== 0 ? `${percent.toFixed(1)}%` : '0%'}
                    </span>
                );
            }

            case 'totalValue': {
                if (!item.totalValue) return '—';
                return <span className="text-sm">{new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(item.totalValue).replace('₽', ' ₽')}</span>;
            }

            default: return null;
        }
    }, [showWarehouseRawNames, showShortNames, isProductView, wordWrap]);

    // ── Загрузка при маунте ──

    useEffect(() => {
        if (catalog.length === 0) {
            loadCatalog();
        }

        // Обработка перехода из глобального поиска
        if (warehouseRootPage && typeof warehouseRootPage === 'string') {
            setViewMode('tree');
            setCurrentFolderId(warehouseRootPage);
            const folder = catalog.find(c => c._id === warehouseRootPage);
            if (folder) {
                setCurrentFolderName(folder.name);
            }
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [warehouseRootPage, catalog]);

    // Esc listener to clear selection and highlights
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                clearSelection();
                clearHighlightedIds();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [clearSelection, clearHighlightedIds]);

    // ── Синхронизация режима отображения с правым футером ──
    useEffect(() => {
        if (activeRightCardId === 'flat' && viewMode !== 'flat') {
            setViewMode('flat');
            setWarehouseView('products');
            setCurrentFolderId(null);
            setCurrentFolderName(null);
            setCurrentPage(1);
        } else if (activeRightCardId === 'tree' && viewMode !== 'tree') {
            setViewMode('tree');
            setWarehouseView('folders');
            setCurrentFolderId(null);
            setCurrentFolderName(null);
            setCurrentPage(1);
        }
    }, [activeRightCardId, viewMode, setCurrentPage, setWarehouseView]);

    // ── Реакция на изменение папки ──
    useEffect(() => {
        setWarehouseFolderId(currentFolderId);
        if (currentFolderId !== null) {
            // Дополнительный сброс на первую страницу, если пользователь "проваливается" в папку
            setCurrentPage(1);
        } else {
            // Восстанавливаем страницу при выходе в корень (если это был номер страницы)
            if (typeof warehouseRootPage === 'number') {
                setCurrentPage(warehouseRootPage);
            } else {
                setCurrentPage(1);
            }
        }
    }, [currentFolderId, setCurrentPage, warehouseRootPage, setWarehouseFolderId]);

    // ── Обновление карточек правого футера ──
    const folderStats = useMemo(() => {
        let rootCount = 0;
        let subCount = 0;
        let itemsCount = 0;

        for (const item of catalog) {
            if (item.isFolder) {
                const isRoot = item.parentId === "";
                if (isRoot) rootCount++;
                else subCount++;
            } else {
                itemsCount++;
            }
        }
        return { rootCount, subCount, totalFolders: rootCount + subCount, itemsCount };
    }, [catalog]);

    useEffect(() => {
        setRightFooterCards([
            {
                id: 'tree',
                label: 'Папки',
                shortLabel: 'Папка',
                count: folderStats.totalFolders,
                customCount: (
                    <div className="flex items-center gap-1 text-sm">
                        <span className="font-bold">{folderStats.totalFolders}</span>
                        <span className="opacity-50 font-normal">/</span>
                        <span className="font-normal opacity-90">{folderStats.rootCount}</span>
                        <span className="opacity-50 font-normal">/</span>
                        <span className="font-normal opacity-90">{folderStats.subCount}</span>
                    </div>
                ),
                tooltip: `Всего: ${folderStats.totalFolders} | Основные: ${folderStats.rootCount} | Вложенные: ${folderStats.subCount}`
            },
            {
                id: 'flat',
                label: 'Товары',
                shortLabel: 'Товар',
                count: folderStats.itemsCount,
                customCount: (
                    <span className="font-bold text-sm">{folderStats.itemsCount.toLocaleString('ru-RU')}</span>
                )
            },
        ]);
    }, [setRightFooterCards, folderStats]);

    // ── Обновление заголовка и экшенов в чердаке ──
    useEffect(() => {
        const actions = [
            {
                id: 'refresh',
                icon: RefreshCw,
                label: isParsing ? 'Загрузка...' : 'Обновить',
                onClick: () => loadCatalog(true)
            }
        ];

        const pageContextStr = currentFolderId === null ? 'Склад' : 'Товары';

        let focusItemStr = '';
        if (currentFolderId === null) {
            focusItemStr = viewMode === 'tree' ? `Папки` : 'Все товары';
        } else {
            focusItemStr = currentFolderName || 'Папка';
        }

        // Построение иерархического дерева папок (Только Путь + Соседи)
        let folderTree: { id: string | null; name: string; level: number; isCurrent?: boolean; isSibling?: boolean }[] | undefined = undefined;

        if (currentFolderId !== null) {
            folderTree = [];
            const ancestors: WarehouseItem[] = [];
            let curr = catalog.find(i => i._id === currentFolderId);

            // 1. Собираем всех предков текущей папки
            while (curr) {
                ancestors.unshift(curr);
                const pid = curr.parentId;
                curr = pid ? catalog.find(i => i._id === pid) : undefined;
            }

            // 2. Добавляем корень
            folderTree.push({ id: null, name: 'Склад', level: 0 });

            // 3. Добавляем предков (кроме самой текущей папки, она пойдет вместе с соседями)
            for (let i = 0; i < ancestors.length - 1; i++) {
                const ancestor = ancestors[i];
                folderTree.push({
                    id: ancestor._id,
                    name: ancestor.name || 'Без названия',
                    level: i + 1
                });
            }

            // 4. Находим соседей текущей папки
            const currentFolder = ancestors[ancestors.length - 1];
            const parentIdOfCurrent = currentFolder?.parentId || null;

            const siblings = catalog.filter(i => {
                return i.isFolder && i.parentId === parentIdOfCurrent;
            });

            // Сортируем соседей по алфавиту
            siblings.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            // 5. Добавляем соседей (и саму текущую папку среди них)
            const siblingsLevel = ancestors.length;

            // Если текущая папка была найдена, гарантируем ее добавление даже если она не в siblings
            // (хотя она там будет, так как фильтр не исключает currentFolderId)
            const sortedSiblings = siblings.filter(s => s._id !== currentFolderId);
            const currentObj = siblings.find(s => s._id === currentFolderId) || currentFolder;

            if (currentObj) {
                folderTree.push({
                    id: currentObj._id,
                    name: currentObj.name || 'Без названия',
                    level: siblingsLevel,
                    isCurrent: true
                });
            }

            for (const sibling of sortedSiblings) {
                folderTree.push({
                    id: sibling._id,
                    name: sibling.name || 'Без названия',
                    level: siblingsLevel,
                    isSibling: true
                });
            }
        }

        setHeaderContext(
            pageContextStr,
            focusItemStr,
            actions as any,
            {
                onClick: () => {
                    setCurrentFolderId(null);
                    setCurrentFolderName(null);
                    if (typeof warehouseRootPage === 'string') {
                        setWarehouseRootPage(1); // сброс корневой навигации
                    }
                },
                disabled: currentFolderId === null || isParsing
            },
            folderTree,
            (id: string | null) => {
                if (id === null) {
                    setCurrentFolderId(null);
                    setCurrentFolderName(null);
                } else {
                    const target = catalog.find(i => i._id === id);
                    if (target) {
                        setCurrentFolderId(target._id);
                        setCurrentFolderName(target.name);
                    }
                }
            }
        );

        return () => clearHeaderContext();
    }, [viewMode, currentFolderId, currentFolderName, isParsing, loadCatalog, setHeaderContext, clearHeaderContext, setCurrentPage, folderStats, catalog]);

    // ── Фильтрация данных согласно режиму, папке и поиску ──
    const filteredData = useMemo(() => {
        let rootPassCount = 0;
        const result = catalog.filter(item => {
            let visible = false;

            if (viewMode === 'flat') {
                visible = !item.isFolder;
            } else {
                if (currentFolderId === null) {
                    const isRoot = item.parentId === "";
                    if (isRoot) rootPassCount++;
                    visible = isRoot;
                } else {
                    visible = String(item.parentId) === String(currentFolderId);
                }
            }

            // Ранний возврат, если по базовым правилам (дерево/список) элемент скрыт
            if (!visible) return false;

            // ── Фильтр по статусу ──
            if (statusFilter) {
                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                const price = item.price || 0;

                if (item.isFolder) {
                    // Для папок используем агрегированные счётчики
                    if (statusFilter === 'minus' && !(item.minusesCount && item.minusesCount > 0)) return false;
                    if (statusFilter === 'money' && !(item.moneyIssuesCount && item.moneyIssuesCount > 0)) return false;
                    if (statusFilter === 'stock' && !(item.zeroStockCount && item.zeroStockCount > 0)) return false;
                    if (statusFilter === 'multi') {
                        // Папка показывается, если в ней есть хотя бы 2 типа ошибок одновременно
                        const folderIssueTypes = ((item.minusesCount ?? 0) > 0 ? 1 : 0) + ((item.moneyIssuesCount ?? 0) > 0 ? 1 : 0) + ((item.zeroStockCount ?? 0) > 0 ? 1 : 0);
                        if (folderIssueTypes < 2) return false;
                    }
                } else {
                    // Для товаров вычисляем inline
                    if (statusFilter === 'minus' && !(item.stock < 0)) return false;
                    if (statusFilter === 'money' && !(purchase <= 0 || price <= 0 || price <= purchase)) return false;
                    if (statusFilter === 'stock' && !(item.stock === 0)) return false;

                    if (statusFilter === 'multi') {
                        const hasMinuses = item.stock < 0;
                        const hasMoneyIssues = purchase <= 0 || price <= 0 || price <= purchase;
                        const hasZeroes = item.stock === 0;
                        const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);
                        if (errorsCount < 2) return false;
                    }
                }
            }

            // ── Фильтр "Только выделенные" ──
            if (showOnlySelected && selectedIds.size > 0) {
                if (!selectedIds.has(item._id)) return false;
            }

            // ── Фильтр папок по календарному диапазону (через дату регистрации мастера) ──
            if (dateRange.start && dateRange.end && item.isFolder && currentFolderId === null) {
                // Найти мастера с таким же именем
                const matchingMaster = masters.find(m => m.name === item.name);
                if (!matchingMaster || !matchingMaster.created) return false;
                let ts = Number(matchingMaster.created);
                if (isNaN(ts) && typeof matchingMaster.created === 'string') {
                    ts = new Date(matchingMaster.created).getTime();
                } else if (ts > 0 && ts < 10000000000) {
                    ts = ts * 1000;
                }
                if (!ts || isNaN(ts)) return false;
                const rangeStart = dateRange.start.getTime();
                const rangeEnd = dateRange.end.getTime() + 86399999;
                if (ts < rangeStart || ts > rangeEnd) return false;
            }

            // Дополнительно применяем поиск по колонкам
            if (effectiveSearchTerm) {
                if (activeSearchCol) {
                    let compareValue = '';
                    switch (activeSearchCol) {
                        case 'name':
                            compareValue = item.name ?? '';
                            break;
                        case 'category':
                            compareValue = item.category ?? '';
                            break;
                        case 'code':
                            compareValue = item.code ?? '';
                            break;
                        case 'article':
                            compareValue = item.article ?? '';
                            break;
                        case 'barcode':
                            compareValue = item.barcode ?? '';
                            break;
                    }

                    if (!compareValue.toLowerCase().includes(effectiveSearchTerm)) {
                        return false;
                    }
                } else {
                    const match = (item.name?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.code?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.article?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.barcode?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.category?.toLowerCase().includes(effectiveSearchTerm));
                    if (!match) return false;
                }
            }

            return true;
        });

        if (currentFolderId === null && viewMode === 'tree') {
            console.log(`[WarehousePage] Фильтр корня: прошло ${rootPassCount} эл. из ${catalog.length}`);
        }

        return result;
    }, [catalog, viewMode, currentFolderId, activeSearchCol, debouncedSearchTerm, statusFilter, showOnlySelected, selectedIds, dateRange, masters]);

    const baseFilteredData = useMemo(() => {
        return catalog.filter(item => {
            let visible = false;

            if (viewMode === 'flat') {
                visible = !item.isFolder;
            } else {
                if (currentFolderId === null) {
                    visible = item.parentId === "";
                } else {
                    visible = String(item.parentId) === String(currentFolderId);
                }
            }

            if (!visible) return false;

            if (statusFilter) {
                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                const price = item.price || 0;

                if (item.isFolder) {
                    if (statusFilter === 'minus' && !(item.minusesCount && item.minusesCount > 0)) return false;
                    if (statusFilter === 'money' && !(item.moneyIssuesCount && item.moneyIssuesCount > 0)) return false;
                    if (statusFilter === 'stock' && !(item.zeroStockCount && item.zeroStockCount > 0)) return false;
                    if (statusFilter === 'multi') {
                        const folderIssueTypes = ((item.minusesCount ?? 0) > 0 ? 1 : 0) + ((item.moneyIssuesCount ?? 0) > 0 ? 1 : 0) + ((item.zeroStockCount ?? 0) > 0 ? 1 : 0);
                        if (folderIssueTypes < 2) return false;
                    }
                } else {
                    if (statusFilter === 'minus' && !(item.stock < 0)) return false;
                    if (statusFilter === 'money' && !(purchase <= 0 || price <= 0 || price <= purchase)) return false;
                    if (statusFilter === 'stock' && !(item.stock === 0)) return false;

                    if (statusFilter === 'multi') {
                        const hasMinuses = item.stock < 0;
                        const hasMoneyIssues = purchase <= 0 || price <= 0 || price <= purchase;
                        const hasZeroes = item.stock === 0;
                        const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);
                        if (errorsCount < 2) return false;
                    }
                }
            }

            if (showOnlySelected && selectedIds.size > 0) {
                if (!selectedIds.has(item._id)) return false;
            }

            if (effectiveSearchTerm) {
                if (activeSearchCol) {
                    let compareValue = '';
                    switch (activeSearchCol) {
                        case 'name': compareValue = item.name ?? ''; break;
                        case 'category': compareValue = item.category ?? ''; break;
                        case 'code': compareValue = item.code ?? ''; break;
                        case 'article': compareValue = item.article ?? ''; break;
                        case 'barcode': compareValue = item.barcode ?? ''; break;
                    }

                    if (!compareValue.toLowerCase().includes(effectiveSearchTerm)) {
                        return false;
                    }
                } else {
                    const match = (item.name?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.code?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.article?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.barcode?.toLowerCase().includes(effectiveSearchTerm)) ||
                        (item.category?.toLowerCase().includes(effectiveSearchTerm));
                    if (!match) return false;
                }
            }

            return true;
        });
    }, [catalog, viewMode, currentFolderId, activeSearchCol, debouncedSearchTerm, statusFilter, showOnlySelected, selectedIds]);

    // ── Ренейм особых папок "на лету" ──
    const getDisplayName = (item: typeof catalog[0]) => {
        if (!item.isFolder || currentFolderId !== null) return item.name;

        // Только в корне (когда currentFolderId === null) переименовываем
        if (item.name.includes('Яя') && item.name.includes('(Архив)')) return 'Архивные мастера';
        if (item.name.includes('Яя') && item.name.includes('(Архив - Пустая)')) return 'Пустые склады';
        if (item.name.includes('Яя') && item.name.includes('(Товары без папки)')) return 'Товары без склада';

        return item.name;
    };

    // ── Сортировка ──
    const sortedData = useMemo(() => {
        const data = [...filteredData];
        if (!sort) {
            // Дефолтная: папки наверх, затем по имени
            return data.sort((a, b) => {
                // 1. АБСОЛЮТНОЕ ПРАВИЛО: Папки ВСЕГДА сверху
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;

                // 2. Системные папки (Яя) ВСЕГДА внизу среди папок
                if (a.isFolder && b.isFolder) {
                    const aSystem = a.isSystem;
                    const bSystem = b.isSystem;
                    if (aSystem && !bSystem) return 1;
                    if (!aSystem && bSystem) return -1;
                }

                // 3. Обычная сортировка по имени
                return getDisplayName(a).localeCompare(getDisplayName(b), 'ru');
            });
        }

        return data.sort((a, b) => {
            // 1. АБСОЛЮТНОЕ ПРАВИЛО: Папки ВСЕГДА сверху
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;

            // 2. Системные папки (Яя) ВСЕГДА внизу среди папок (кроме сортировки по типу)
            if (sort.col !== 'type' && a.isFolder && b.isFolder) {
                const aSystem = a.isSystem;
                const bSystem = b.isSystem;
                if (aSystem && !bSystem) return 1;
                if (!aSystem && bSystem) return -1;
            }

            // 3. Если оба элемента одного типа, применяем сортировку пользователя
            const isEmpty = (val: any) => val === null || val === undefined || val === '' || val === '—';
            let av: any, bv: any;

            switch (sort.col) {
                case 'type': {
                    // 1 = папки с вложенными (не системные), 2 = обычные папки, 3 = системные
                    // 4 = товары С ФОТО, 5 = товары БЕЗ ФОТО
                    const getTypePriority = (i: typeof a) => {
                        if (i.isFolder) {
                            if (i.isSystem) return 3;
                            if (i.hasSubfolders || (i.subFoldersCount && i.subFoldersCount > 0)) return 1;
                            return 2;
                        }
                        // Для товаров: проверяем наличие фото
                        return (i.pic && i.pic.length > 0) ? 4 : 5;
                    };
                    av = getTypePriority(a);
                    bv = getTypePriority(b);
                    break;
                }
                case 'name': av = getDisplayName(a); bv = getDisplayName(b); break;
                case 'category': av = a.category; bv = b.category; break;
                case 'skuCount': av = a.isFolder ? a.skuCount : 0; bv = b.isFolder ? b.skuCount : 0; break;
                case 'stock': av = a.isFolder ? a.totalStock : a.stock; bv = b.isFolder ? b.totalStock : b.stock; break;
                case 'totalValue': av = a.totalValue; bv = b.totalValue; break;
                case 'minusesCount': av = a.minusesCount || 0; bv = b.minusesCount || 0; break;
                case 'moneyIssuesCount': av = a.moneyIssuesCount || 0; bv = b.moneyIssuesCount || 0; break;
                case 'zeroStockCount': av = a.isFolder ? a.zeroStockCount : 0; bv = b.isFolder ? b.zeroStockCount : 0; break;
                case 'code': av = a.code || ''; bv = b.code || ''; break;
                case 'article': av = a.article || ''; bv = b.article || ''; break;
                case 'barcode': av = a.barcode || ''; bv = b.barcode || ''; break;
                case 'purchase': av = a.purchase || a.cost || a.purchasePrice || 0; bv = b.purchase || b.cost || b.purchasePrice || 0; break;
                case 'price': av = a.price || 0; bv = b.price || 0; break;
                case 'profit': av = (a.price || 0) - (a.purchase || a.cost || a.purchasePrice || 0); bv = (b.price || 0) - (b.purchase || b.cost || b.purchasePrice || 0); break;
                case 'margin': {
                    const profitA = (a.price || 0) - (a.purchase || a.cost || a.purchasePrice || 0);
                    const profitB = (b.price || 0) - (b.purchase || b.cost || b.purchasePrice || 0);
                    av = a.price ? (profitA / a.price) * 100 : 0;
                    bv = b.price ? (profitB / b.price) * 100 : 0;
                    break;
                }
                case 'roi': {
                    const purchaseA = a.purchase || a.cost || a.purchasePrice || 0;
                    const purchaseB = b.purchase || b.cost || b.purchasePrice || 0;
                    const profitA = (a.price || 0) - purchaseA;
                    const profitB = (b.price || 0) - purchaseB;
                    av = purchaseA ? (profitA / purchaseA) * 100 : 0;
                    bv = purchaseB ? (profitB / purchaseB) * 100 : 0;
                    break;
                }
                case 'sales': av = 0; bv = 0; break; // Пока заглушка
                case 'status': {
                    if (isProductView) {
                        const getStatusPriority = (i: typeof a) => {
                            if (i.isFolder) return 0;
                            const purchase = i.purchase || i.cost || i.purchasePrice || 0;
                            const price = i.price || 0;

                            const hasMinuses = i.stock < 0;
                            const hasMoneyIssues = purchase <= 0 || price <= 0 || price <= purchase;
                            const hasZeroes = i.stock === 0;

                            const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);

                            if (errorsCount > 1) {
                                // ⚠️ - Highest priority (2 or 3 errors)
                                // We use 10 + errorsCount so 3 errors (13) is sorted above 2 errors (12)
                                return 10 + errorsCount;
                            } else if (hasMinuses) {
                                return 4; // 📉 Отрицательный остаток
                            } else if (hasMoneyIssues) {
                                return 3; // 💸 Ошибка в цене или закупе
                            } else if (hasZeroes) {
                                return 2; // 📦 Товар закончился
                            } else {
                                return 1; // Check Всё в порядке
                            }
                        };
                        av = getStatusPriority(a);
                        bv = getStatusPriority(b);
                    } else {
                        const getE = (i: typeof a) => (i.minusesCount && i.minusesCount > 0 ? 1 : 0) + (i.moneyIssuesCount && i.moneyIssuesCount > 0 ? 1 : 0) + (i.zeroStockCount && i.zeroStockCount > 0 ? 1 : 0);
                        av = getE(a); bv = getE(b);
                    }
                    break;
                }
                default: av = ''; bv = ''; break;
            }

            const aEmpty = isEmpty(av);
            const bEmpty = isEmpty(bv);

            if (aEmpty && bEmpty) return 0;
            if (aEmpty) return 1;
            if (bEmpty) return -1;

            let comparison = 0;
            switch (sort.col) {
                case 'name':
                case 'category':
                case 'code':
                case 'article':
                case 'barcode':
                    comparison = String(av).localeCompare(String(bv), 'ru');
                    break;
                case 'type':
                case 'skuCount':
                case 'stock':
                case 'totalValue':
                case 'minusesCount':
                case 'moneyIssuesCount':
                case 'zeroStockCount':
                case 'status':
                case 'purchase':
                case 'price':
                case 'profit':
                case 'margin':
                case 'roi':
                case 'sales':
                    comparison = Number(av) - Number(bv);
                    break;
                default:
                    break;
            }

            if (comparison === 0) {
                comparison = String(getDisplayName(a)).localeCompare(String(getDisplayName(b)), 'ru');
            }

            return sort.dir === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sort]);

    // ── Автоскролл и переключение страницы для поиска ──
    useEffect(() => {
        if (highlightedIds.size > 0) {
            const timer = setTimeout(() => {
                clearHighlightedIds();
            }, 3000);

            const firstId = Array.from(highlightedIds)[0];
            if (firstId) {
                // Находим на какой странице этот элемент
                const index = sortedData.findIndex(item => item._id === firstId);
                if (index !== -1) {
                    const targetPage = Math.floor(index / pageSize) + 1;
                    if (targetPage !== currentPage) {
                        setCurrentPage(targetPage);
                    }
                }

                // Ждем рендера и скроллим
                setTimeout(() => {
                    const el = document.getElementById(`row-${firstId}`);
                    if (el) {
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 150);
            }

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightedIds]);

    // 2. Правильная нарезка массива (slice)
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = currentPage * pageSize;
        return sortedData.slice(start, end);
    }, [sortedData, currentPage, pageSize]);


    // 3. Обновляем статистику в футере таблицы
    useEffect(() => {
        setTotalRows(filteredData.length);
        setTotalPages(Math.ceil(filteredData.length / pageSize) || 1);
    }, [filteredData.length, pageSize, setTotalRows, setTotalPages]);

    // ── Регистрация callback экспорта для RightPanel ──
    const sortedDataRef = useRef(sortedData);
    sortedDataRef.current = sortedData;
    const activeColumnsRef = useRef(activeColumns);
    activeColumnsRef.current = activeColumns;
    const viewModeRef = useRef(viewMode);
    viewModeRef.current = viewMode;
    const currentFolderIdRef = useRef(currentFolderId);
    currentFolderIdRef.current = currentFolderId;
    const currentFolderNameRef = useRef(currentFolderName);
    currentFolderNameRef.current = currentFolderName;

    useEffect(() => {
        const exportFn = () => {
            const getValue = (row: any, colId: string, rowIndex: number) => {
                switch (colId) {
                    case 'index': return rowIndex + 1;
                    case 'name': {
                        const rawName = getDisplayName(row);
                        const cleanName = rawName.replace(/\([^)]+\)/g, '').replace(/\[[^\]]+\]/g, '').replace(/`.+?`/g, '').replace(/\|[^|]+\|/g, '').trim() || rawName;
                        return row.isFolder ? (showWarehouseRawNames ? rawName : cleanName) : rawName;
                    }
                    case 'category': return row.category || '';
                    case 'skuCount': return row.skuCount || 0;
                    case 'stock': return row.isFolder ? (row.totalStock ?? 0) : (row.stock ?? 0);
                    case 'totalValue': return row.totalValue || 0;
                    case 'minusesCount': return row.minusesCount || 0;
                    case 'moneyIssuesCount': return row.moneyIssuesCount || 0;
                    case 'zeroStockCount': return row.zeroStockCount || 0;
                    case 'code': return row.code || '';
                    case 'article': return row.article || '';
                    case 'barcode': return row.barcode || '';
                    case 'purchase': return row.purchase || row.cost || row.purchasePrice || 0;
                    case 'price': return row.price || 0;
                    case 'profit': return (row.price || 0) - (row.purchase || row.cost || row.purchasePrice || 0);
                    case 'margin': {
                        const profit = (row.price || 0) - (row.purchase || row.cost || row.purchasePrice || 0);
                        return row.price ? ((profit / row.price) * 100).toFixed(1) + '%' : '0%';
                    }
                    case 'roi': {
                        const purchase = row.purchase || row.cost || row.purchasePrice || 0;
                        const profit = (row.price || 0) - purchase;
                        return purchase ? ((profit / purchase) * 100).toFixed(1) + '%' : '0%';
                    }
                    case 'status': {
                        const purchase = row.purchase || row.cost || row.purchasePrice || 0;
                        const price = row.price || 0;
                        const hasMinuses = row.isFolder ? (row.minusesCount > 0) : (row.stock < 0);
                        const hasMoneyIssues = row.isFolder
                            ? (row.moneyIssuesCount > 0)
                            : (purchase <= 0 || price <= 0 || price <= purchase);
                        const hasZeroes = row.isFolder ? (row.zeroStockCount > 0) : (row.stock === 0);
                        const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);
                        if (errorsCount === 0) return 'ОК';
                        return 'Ошибка';
                    }
                    default: return '';
                }
            };
            const cols = activeColumnsRef.current
                .filter(c => c.id !== 'type' && c.id !== 'status')
                .map(c => {
                    return { id: c.id, label: typeof c.label === 'string' ? c.label : '' };
                });

            // Динамическое имя файла на основе режима просмотра
            let exportName: string;
            if (viewModeRef.current === 'flat') {
                exportName = 'Склад - Все товары';
            } else if (currentFolderIdRef.current) {
                const folderName = (currentFolderNameRef.current || 'Папка')
                    .replace(/\([^)]+\)/g, '').replace(/\[[^\]]+\]/g, '').trim();
                exportName = `${folderName} - Товары`;
            } else {
                exportName = 'Склад - Папки';
            }

            exportSmartTable(sortedDataRef.current, cols, getValue, selectedIds, '_id', exportName);
        };
        setExportCallback(exportFn);
        return () => setExportCallback(null);
    }, [selectedIds, setExportCallback, viewMode, currentFolderId, showWarehouseRawNames, showShortNames]);

    const toggleSort = (colId: ColId) =>
        setSort(prev => {
            if (prev?.col !== colId) return { col: colId, dir: 'asc' };
            if (prev.dir === 'asc') return { col: colId, dir: 'desc' };
            return null; // Сброс сортировки
        });

    // Логика состояния чекбокса в заголовке
    const visibleIds = useMemo(() => sortedData.map(d => d._id), [sortedData]);
    const allFilteredIds = useMemo(() => filteredData.map(d => d._id), [filteredData]);
    const baseIds = useMemo(() => baseFilteredData.map(d => d._id), [baseFilteredData]);

    // DND Handlers
    const handleDragStart = (e: React.DragEvent, colId: string) => {
        setDraggedColId(colId);
        e.dataTransfer.effectAllowed = 'move';
        document.body.classList.add('dragging-column');
    };

    const handleDragOver = (e: React.DragEvent, targetCol: ColDef) => {
        e.preventDefault();
        if (!draggedColId || draggedColId === targetCol.id || targetCol.sticky === true) return;

        e.dataTransfer.dropEffect = 'move';

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midPoint = rect.left + rect.width / 2;
        const pos = e.clientX < midPoint ? 'left' : 'right';

        setDragOverColId(targetCol.id);
        setDropPosition(pos);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        setDragOverColId(null);
        setDropPosition(null);
    };

    const handleDrop = (e: React.DragEvent, targetCol: ColDef) => {
        e.preventDefault();
        document.body.classList.remove('dragging-column');

        if (!draggedColId || draggedColId === targetCol.id || targetCol.sticky === true) {
            setDraggedColId(null);
            setDragOverColId(null);
            setDropPosition(null);
            return;
        }

        const currentIds = activeColumns.map(c => c.id);
        const fromIndex = currentIds.indexOf(draggedColId as ColId);
        let toIndex = currentIds.indexOf(targetCol.id);

        if (fromIndex === -1 || toIndex === -1) return;

        if (dropPosition === 'right') {
            toIndex += 1;
        }

        let firstReorderableIndex = 0;
        for (let i = 0; i < activeColumns.length; i++) {
            if (activeColumns[i].isDragDisabled) firstReorderableIndex = i + 1;
        }
        toIndex = Math.max(toIndex, firstReorderableIndex);

        const newOrder = [...currentIds];
        const [movedId] = newOrder.splice(fromIndex, 1);

        if (fromIndex < toIndex) {
            toIndex -= 1;
        }

        newOrder.splice(toIndex, 0, movedId);

        setColumnOrder('warehouse', newOrder);
        setDraggedColId(null);
        setDragOverColId(null);
        setDropPosition(null);
    };

    const handleDragEnd = () => {
        document.body.classList.remove('dragging-column');
        setDraggedColId(null);
        setDragOverColId(null);
        setDropPosition(null);
    };

    useEffect(() => {
        setAllFilteredIds(allFilteredIds);
        setBaseFilteredIds(baseIds);
    }, [allFilteredIds, baseIds, setAllFilteredIds, setBaseFilteredIds]);

    const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    const isAllFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

    const handleHeaderCheckClick = () => {
        if (isAllFilteredSelected) {
            clearSelection();
        } else if (isAllVisibleSelected) {
            setSelection(new Set(allFilteredIds));
        } else {
            const next = new Set(selectedIds);
            visibleIds.forEach(id => next.add(id));
            setSelection(next);
        }
    };

    // ── onRowClick callback ──
    const onRowClick = useCallback((item: any, e: React.MouseEvent) => {
        if (highlightedIds.has(item._id)) clearHighlightedIds();
        if (selectedIds.size > 0) {
            toggleSelection(item._id);
            return;
        }
        if (item.isFolder && viewMode === 'tree') {
            if (currentFolderId === null) {
                setWarehouseRootPage(currentPage);
            }
            setCurrentFolderId(item._id);
            setCurrentFolderName(item.name);
        }
    }, [highlightedIds, clearHighlightedIds, selectedIds, toggleSelection, viewMode, currentFolderId, currentPage, setWarehouseRootPage]);

    // ── Установка контекста шапки ──
    useEffect(() => {
        setHeaderContext(
            'Склад',
            null,
            [{ id: 'refresh', icon: RefreshCw, label: 'Обновить', onClick: () => loadCatalog() }],
            { onClick: () => { }, disabled: true }
        );
        return () => clearHeaderContext();
    }, [setHeaderContext, clearHeaderContext, loadCatalog]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <VirtualSmartTable
                data={paginatedData}
                activeColumns={activeColumns}
                sort={sort}
                toggleSort={toggleSort}
                activeSearchCol={activeSearchCol}
                searchTerm={searchTerm}
                setSearchCol={setSearchCol}
                setSearchTerm={setSearchTerm}
                selectedIds={selectedIds}
                toggleSelection={toggleSelection}
                isAllVisibleSelected={isAllVisibleSelected}
                isAllFilteredSelected={isAllFilteredSelected}
                handleHeaderCheckClick={handleHeaderCheckClick}
                highlightedIds={highlightedIds}
                clearHighlightedIds={clearHighlightedIds}
                wordWrap={!!wordWrap}
                draggedColId={draggedColId}
                handleDragStart={handleDragStart}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                dragOverColId={dragOverColId}
                dropPosition={dropPosition}
                onRowClick={onRowClick}
                getDisplayName={getDisplayName}
                getCellValue={getCellValue}
                startIndex={(currentPage - 1) * pageSize}
            />
        </div>
    );
}
