import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { RefreshCw, Package, ArrowLeft, Folder, FolderCog, ExternalLink, Activity, ChevronRight, FolderTree, CheckSquare, MinusSquare, Square, TriangleAlert, Check } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { useDebounce } from '../../hooks/useDebounce';
import { type WarehouseItem } from '../../utils/parseCatalog';
import { CSS } from '../../utils/cssVars';
import { Checkbox } from '../../components/ui/checkbox';
import { cn } from '../../components/ui/utils';
import type { ColDef, ColId, SortDir } from '../../core/types/table';
import { exportSmartTable } from '../../utils/exportToExcel';
import { type Master } from '../../api/client';
import { useWarehouseLogic } from './hooks/useWarehouseLogic';
import { useFolderColumns, useProductColumns } from './config/warehouseColumns';
import { WarehouseHeader } from './components/WarehouseHeader';
import { WarehouseTableContainer } from './components/WarehouseTableContainer';

// ─── Константы КОЛОНОК ────────────────────────────────────────────────────────
export function getWarehouseDisplayName(item: WarehouseItem, currentFolderId: string | null): string {
    if (!item.isFolder || currentFolderId !== null) return item.name || '';

    if (item.name.includes('Яя') && item.name.includes('(Архив)')) return 'Архивные мастера';
    if (item.name.includes('Яя') && item.name.includes('(Архив - Пустая)')) return 'Пустые склады';
    if (item.name.includes('Яя') && item.name.includes('(Товары без папки)')) return 'Товары без склада';

    return item.name || '';
}

export function renderWarehouseCell(
    item: WarehouseItem,
    colId: string,
    options: { showWarehouseRawNames: boolean; wordWrap: boolean; isProductView: boolean; currentFolderId: string | null }
): any {
    const { showWarehouseRawNames, wordWrap, isProductView, currentFolderId } = options;

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
            return item[colId as keyof WarehouseItem] || '—';

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
            const rawName = getWarehouseDisplayName(item, currentFolderId);
            const cleanName = rawName.replace(/\([^)]+\)/g, '').replace(/\[[^\]]+\]/g, '').replace(/`.+?`/g, '').replace(/\|[^|]+\|/g, '').trim() || rawName;
            let displayName = item.isFolder ? (showWarehouseRawNames ? rawName : cleanName) : rawName;
            const cloudShopUrl = item.isFolder
                ? null
                : `https://web.cloudshop.ru/card/catalog/list/m/get/${item._id}`;
            return (
                <div className="flex items-center gap-2 pr-2 min-w-0 justify-between w-full text-sm">
                    <span className={cn(
                        "flex-1 min-w-0 overflow-x-hidden",
                        item.isFolder && "text-blue-600 font-medium",
                        wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto" : "truncate"
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

        case 'category': return item.category || '—';
        case 'sales': return (item as any).sales ?? 0;

        default: return null;
    }
}

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

    const FOLDER_COLUMNS = useFolderColumns(!!showWarehouseRawNames, !!showShortNames, warehousePrefs.warehouseView || viewMode);
    const PRODUCT_COLUMNS = useProductColumns(!!showWarehouseRawNames, !!showShortNames, warehousePrefs.warehouseView || viewMode);

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

    // Поиск
    const [activeSearchCol, setSearchCol] = useState<ColId | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);
    const isBarcodeSearch = /^\d{8,}$/.test(searchTerm);
    const effectiveSearchTerm = (isBarcodeSearch ? searchTerm : debouncedSearchTerm).toLowerCase();

    // ── Выносим логику в хук ──
    const {
        filteredData,
        baseFilteredData,
        sortedData,
        paginatedData,
        sort,
        toggleSort,
        getDisplayName,
        getExportValue
    } = useWarehouseLogic({
        catalog,
        viewMode,
        currentFolderId,
        activeSearchCol,
        debouncedSearchTerm,
        effectiveSearchTerm,
        statusFilter,
        showOnlySelected,
        selectedIds,
        dateRange,
        masters,
        currentPage,
        pageSize,
        isProductView
    });


    // Логика рендеринга ячеек
    const getCellValue = useCallback((item: WarehouseItem, colId: string): any => {
        return renderWarehouseCell(item, colId, {
            showWarehouseRawNames: !!showWarehouseRawNames,
            wordWrap: !!wordWrap,
            isProductView,
            currentFolderId
        });
    }, [showWarehouseRawNames, wordWrap, isProductView, currentFolderId]);

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

            exportSmartTable(sortedDataRef.current, cols, getExportValue, selectedIds, '_id', exportName);
        };
        setExportCallback(exportFn);
        return () => setExportCallback(null);
    }, [selectedIds, setExportCallback, viewMode, currentFolderId, getExportValue]);



    // Логика состояния чекбокса в заголовке


    // Онроуклик callback ──
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

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <WarehouseHeader
                catalog={catalog}
                viewMode={viewMode}
                currentFolderId={currentFolderId}
                currentFolderName={currentFolderName}
                isParsing={isParsing}
                warehouseRootPage={warehouseRootPage}
                loadCatalog={loadCatalog}
                setHeaderContext={setHeaderContext}
                clearHeaderContext={clearHeaderContext}
                setRightFooterCards={setRightFooterCards}
                setCurrentFolderId={setCurrentFolderId}
                setCurrentFolderName={setCurrentFolderName}
                setCurrentPage={setCurrentPage}
                setWarehouseRootPage={setWarehouseRootPage}
            />
            <WarehouseTableContainer
                paginatedData={paginatedData}
                activeColumns={activeColumns}
                sort={sort}
                toggleSort={toggleSort}
                activeSearchCol={activeSearchCol}
                searchTerm={searchTerm}
                setSearchCol={setSearchCol}
                setSearchTerm={setSearchTerm}
                selectedIds={selectedIds}
                toggleSelection={toggleSelection}
                clearSelection={clearSelection}
                setSelection={setSelection}
                highlightedIds={highlightedIds}
                clearHighlightedIds={clearHighlightedIds}
                wordWrap={!!wordWrap}
                onRowClick={onRowClick}
                getDisplayName={getDisplayName}
                getCellValue={getCellValue}
                startIndex={(currentPage - 1) * pageSize}
                sortedData={sortedData}
                filteredData={filteredData}
                baseFilteredData={baseFilteredData}
                setAllFilteredIds={setAllFilteredIds}
                setBaseFilteredIds={setBaseFilteredIds}
                setColumnOrder={setColumnOrder}
            />
        </div>
    );
}
