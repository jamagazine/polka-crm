import { useEffect, useState, useMemo, useRef } from 'react';
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
import { formatShortName } from '../../utils/nameFormatter';
import { exportSmartTable } from '../../utils/exportToExcel';

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
        selectedIds, toggleSelection, clearSelection, setSelection, setAllFilteredIds,
        highlightedIds, clearHighlightedIds,
        warehousePrefs, warehouseColumnOrder, setColumnOrder,
        setExportCallback,
        statusFilter, showOnlySelected, hiddenColumns
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
        highlightedIds: state.highlightedIds,
        clearHighlightedIds: state.clearHighlightedIds,
        warehousePrefs: state.warehousePrefs,
        warehouseColumnOrder: state.warehouseColumnOrder as string[],
        setColumnOrder: state.setColumnOrder as (page: 'masters' | 'warehouse' | 'products', order: string[]) => void,
        setExportCallback: state.setExportCallback,
        statusFilter: state.statusFilter,
        showOnlySelected: state.showOnlySelected,
        hiddenColumns: state.hiddenColumns
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
            sticky: true, stickyLeft: 'left-0',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <Folder className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            responsiveSticky: true, stickyLeft: 'md:left-[50px]',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Тип строки (Системный/Активный/Архив или Папка/Товар)'
        },
        {
            id: 'status', label: <Activity className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            responsiveSticky: true, stickyLeft: 'md:left-[100px]',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Состояние (Стаж или Диагностика ошибок)'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            responsiveSticky: true, stickyLeft: 'md:left-[150px]',
            width: showWarehouseRawNames ? 'w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'w-[250px]' : 'w-[385px]'),
            minWidth: showWarehouseRawNames ? 'min-w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'min-w-[250px]' : 'min-w-[385px]'),
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
            sticky: true, stickyLeft: 'left-0',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <Package className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            responsiveSticky: true, stickyLeft: 'md:left-[50px]',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Фото товара'
        },
        {
            id: 'status', label: <span title="Движение" className="flex items-center justify-center w-full h-full"><Activity className="w-4 h-4 text-muted-foreground" /></span>, sortable: true, searchable: false,
            responsiveSticky: true, stickyLeft: 'md:left-[100px]',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Движение или ошибки'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            responsiveSticky: true, stickyLeft: 'md:left-[150px]',
            width: showWarehouseRawNames ? 'w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'w-[250px]' : 'w-[385px]'),
            minWidth: showWarehouseRawNames ? 'min-w-[500px]' : (!showWarehouseRawNames && showShortNames ? 'min-w-[250px]' : 'min-w-[385px]'),
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
                    // Глобальный поиск по всем текстовым полям, если колонка не выбрана
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
    }, [catalog, viewMode, currentFolderId, activeSearchCol, debouncedSearchTerm, statusFilter, showOnlySelected, selectedIds]);

    // ── Ренейм особых папок "на лету" ──
    const getDisplayName = (item: typeof catalog[0]) => {
        if (!item.isFolder || currentFolderId !== null) return item.name;

        // Только в корне (когда currentFolderId === null) переименовываем
        if (item.name === 'Яя `(Архив)') return 'Архивные мастера';
        if (item.name === 'Яя `(Архив - Пустая)') return 'Пустые склады';
        if (item.name === 'Яя `(Товары без папки)') return 'Товары без склада';

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
                            if (i.hasSubfolders) return 1;
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

    useEffect(() => {
        const exportFn = () => {
            const getValue = (row: any, colId: string) => {
                switch (colId) {
                    case 'name': return getDisplayName(row);
                    case 'category': return row.category || '';
                    case 'skuCount': return row.skuCount || 0;
                    case 'stock': return row.isFolder ? row.totalStock : row.stock;
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
                    default: return '';
                }
            };
            const cols = activeColumnsRef.current
                .filter(c => typeof c.label === 'string')
                .map(c => ({ id: c.id, label: c.label as string }));
            exportSmartTable(sortedDataRef.current, cols, getValue, selectedIds, '_id', 'Склад');
        };
        setExportCallback(exportFn);
        return () => setExportCallback(null);
    }, [selectedIds, setExportCallback]);

    const toggleSort = (colId: ColId) =>
        setSort(prev => {
            if (prev?.col !== colId) return { col: colId, dir: 'asc' };
            if (prev.dir === 'asc') return { col: colId, dir: 'desc' };
            return null; // Сброс сортировки
        });

    // Логика состояния чекбокса в заголовке
    const visibleIds = useMemo(() => paginatedData.map(d => d._id), [paginatedData]);
    const allFilteredIds = useMemo(() => filteredData.map(d => d._id), [filteredData]);

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
    }, [allFilteredIds, setAllFilteredIds]);

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

    // ── Фон для sticky-ячеек больше не нужен, он инкапсулирован в SmartTable.
    const cellBorder = 'border-b border-border';

    return (
        <div className="-mx-6 -my-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="table-fixed min-w-[800px] w-full caption-bottom text-sm border-separate border-spacing-0">
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 h-[50px]">
                            {activeColumns.map(col => {
                                const isDraggable = !col.isDragDisabled;
                                const isDragging = draggedColId === col.id;
                                const isDragOver = dragOverColId === col.id;

                                return (
                                    <SmartTableHead
                                        key={col.id}
                                        col={col}
                                        className={cn('px-2 transition-opacity', isDragging ? 'opacity-30' : '')}
                                        // @ts-ignore
                                        draggable={isDraggable}
                                        onDragStart={(e: React.DragEvent) => isDraggable && handleDragStart(e, col.id)}
                                        onDragOver={(e: React.DragEvent) => isDraggable && handleDragOver(e, col)}
                                        onDragLeave={isDraggable ? handleDragLeave : undefined}
                                        onDrop={(e: React.DragEvent) => isDraggable && handleDrop(e, col)}
                                        onDragEnd={isDraggable ? handleDragEnd : undefined}
                                        isDropTarget={isDragOver}
                                        dropPosition={dropPosition as 'left' | 'right' | null}
                                    >
                                        {col.id === 'index' ? (
                                            <button
                                                onClick={handleHeaderCheckClick}
                                                className="flex items-center justify-center w-full h-full focus:outline-none transition-colors"
                                                title="Выбрать строки"
                                            >
                                                {isAllFilteredSelected ? (
                                                    <CheckSquare className="w-4 h-4 text-primary" />
                                                ) : isAllVisibleSelected ? (
                                                    <MinusSquare className="w-4 h-4 text-primary" />
                                                ) : (
                                                    <Square className="w-4 h-4 text-muted-foreground opacity-30 hover:opacity-100 transition-opacity" />
                                                )}
                                            </button>
                                        ) : (
                                            <SmartColHeader
                                                colLabel={col.label}
                                                colAlign={col.align}
                                                isSortable={col.sortable}
                                                isSearchable={col.searchable}
                                                isDragDisabled={!!col.isDragDisabled}
                                                isSortActive={sort?.col === col.id}
                                                sortDir={sort?.col === col.id ? sort.dir : null}
                                                onSortToggle={() => toggleSort(col.id)}
                                                isSearching={activeSearchCol === col.id}
                                                onSearchOpen={() => { setSearchCol(col.id); setSearchTerm(''); }}
                                                onSearchClose={() => { setSearchCol(null); setSearchTerm(''); }}
                                                searchProps={{
                                                    value: activeSearchCol === col.id ? searchTerm : '',
                                                    onChange: setSearchTerm
                                                }}
                                            />
                                        )}
                                    </SmartTableHead>
                                );
                            })}
                            {/* Spacer to absorb remaining width */}
                            <TableHead className="min-w-[50px]" />
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {paginatedData.map((item, idx) => {
                            const isChecked = selectedIds.has(item._id);
                            const isHighlighted = highlightedIds.has(item._id);

                            return (
                                <TableRow
                                    key={item._id}
                                    id={`row-${item._id}`}
                                    className={cn(
                                        'group',
                                        isHighlighted && 'bg-amber-100/60 animate-pulse',
                                        isChecked && 'bg-primary/5 hover:bg-primary/10',
                                        item.isFolder && selectedIds.size === 0 && 'hover:bg-blue-50/50 cursor-pointer',
                                        selectedIds.size > 0 && 'cursor-pointer hover:bg-muted/50'
                                    )}

                                    onClick={(e) => {
                                        if (isHighlighted) clearHighlightedIds();
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
                                    }}
                                    data-state={isChecked ? 'selected' : undefined}
                                >
                                    {activeColumns.map(col => {
                                        switch (col.id) {
                                            case 'index': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-1', cellBorder)}>
                                                    <div className="relative flex items-center justify-center h-5">
                                                        <span className={cn(
                                                            'text-xs text-muted-foreground select-none transition-opacity duration-100',
                                                            isChecked ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
                                                        )}>
                                                            {(currentPage - 1) * pageSize + idx + 1}
                                                        </span>
                                                        <span
                                                            className={cn(
                                                                'absolute inset-0 flex items-center justify-center transition-opacity duration-100',
                                                                isChecked ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                                                            )}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                onCheckedChange={() => toggleSelection(item._id)}
                                                                aria-label={`Выбрать строку ${idx + 1}`}
                                                            />
                                                        </span>
                                                    </div>
                                                </SmartTableCell>
                                            );

                                            case 'type': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-1', cellBorder)}>
                                                    <div className="flex items-center justify-center relative w-full h-full">
                                                        {item.isFolder ? (
                                                            item.isSystem ? (
                                                                <div className="relative inline-flex items-center justify-center" title="Системная папка">
                                                                    <FolderCog className="w-4 h-4 text-slate-400" />
                                                                    {item.subFoldersCount ? (
                                                                        <span className="absolute -bottom-1.5 -right-3 text-[9px] font-medium text-gray-500 leading-none bg-white/90 rounded px-0.5 border border-transparent">
                                                                            {item.subFoldersCount}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            ) : item.hasSubfolders ? (
                                                                <div className="relative inline-flex items-center justify-center" title={`Вложенных папок: ${item.subFoldersCount}`}>
                                                                    <FolderTree className="w-4 h-4 text-indigo-500 fill-indigo-50" />
                                                                    {item.subFoldersCount ? (
                                                                        <span className="absolute -bottom-1.5 -right-3 text-[9px] font-medium text-gray-500 leading-none bg-white/90 rounded px-0.5 border border-transparent">
                                                                            {item.subFoldersCount}
                                                                        </span>
                                                                    ) : null}
                                                                </div>
                                                            ) : (
                                                                <div className="relative inline-flex items-center justify-center">
                                                                    <Folder className="w-4 h-4 text-blue-500 fill-blue-50" />
                                                                </div>
                                                            )
                                                        ) : (item.pic && item.pic.length > 0) ? (
                                                            <img
                                                                src={item.pic[0]}
                                                                alt={item.name}
                                                                className={cn(
                                                                    "object-cover rounded-md border bg-white",
                                                                    wordWrap ? "w-12 h-12" : "w-8 h-8"
                                                                )}
                                                            />
                                                        ) : (
                                                            <Package className="w-4 h-4 text-slate-500" />
                                                        )}
                                                    </div>
                                                </SmartTableCell>
                                            );

                                            case 'status': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-1', cellBorder)}>
                                                    <div className="flex flex-row flex-wrap items-center justify-center gap-1 w-full h-full">
                                                        {isProductView ? (() => {
                                                            if (item.isFolder) return null;
                                                            const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                                                            const price = item.price || 0;

                                                            const hasMinuses = item.stock < 0;
                                                            const hasMoneyIssues = purchase <= 0 || price <= 0 || price <= purchase;
                                                            const hasZeroes = item.stock === 0;

                                                            const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);

                                                            if (errorsCount > 1) {
                                                                const errorMessages = [];
                                                                if (hasMinuses) errorMessages.push("Отрицательный остаток");
                                                                if (hasMoneyIssues) errorMessages.push("Ошибка в цене или закупе (убыток)");
                                                                if (hasZeroes) errorMessages.push("Товар закончился");
                                                                const complexTitle = `Множественные проблемы:\n- ${errorMessages.join('\n- ')}`;
                                                                return <span title={complexTitle} className="cursor-help inline-flex items-center justify-center"><TriangleAlert className="w-4 h-4 text-red-500" /></span>;
                                                            } else if (hasMinuses) {
                                                                return <span title="Отрицательный остаток" className="text-base leading-none cursor-help inline-flex items-center justify-center">📉</span>;
                                                            } else if (hasMoneyIssues) {
                                                                return <span title="Ошибка в цене или закупе (убыток)" className="text-base leading-none cursor-help inline-flex items-center justify-center">💸</span>;
                                                            } else if (hasZeroes) {
                                                                return <span title="Товар закончился" className="text-base leading-none cursor-help inline-flex items-center justify-center">📦</span>;
                                                            } else {
                                                                return <span title="Всё в порядке" className="cursor-help inline-flex items-center justify-center"><Check className="w-3.5 h-3.5 text-green-500/40" /></span>;
                                                            }
                                                        })() : (() => {
                                                            const hasMinuses = item.minusesCount ? item.minusesCount > 0 : false;
                                                            const hasMoneyIssues = item.moneyIssuesCount ? item.moneyIssuesCount > 0 : false;
                                                            const hasZeroes = item.zeroStockCount ? item.zeroStockCount > 0 : false;

                                                            const errorsCount = (hasMinuses ? 1 : 0) + (hasMoneyIssues ? 1 : 0) + (hasZeroes ? 1 : 0);

                                                            if (errorsCount === 0) return <span title="Проблем не обнаружено" className="cursor-help inline-flex items-center justify-center"><Check className="w-3.5 h-3.5 text-green-500/40" /></span>;
                                                            if (errorsCount > 1) {
                                                                const errorMessages = [];
                                                                if (hasMinuses) errorMessages.push("Отрицательный остаток");
                                                                if (hasMoneyIssues) errorMessages.push("Некорректная цена/закупка");
                                                                if (hasZeroes) errorMessages.push("Нулевой остаток");
                                                                const complexTitle = `Множественные проблемы:\n- ${errorMessages.join('\n- ')}`;
                                                                return <span title={complexTitle} className="cursor-help inline-flex items-center justify-center"><TriangleAlert className="w-4 h-4 text-red-500" /></span>;
                                                            }
                                                            if (hasMinuses) return <span className="text-base leading-none cursor-help inline-flex items-center justify-center" title="Проблема: Отрицательный остаток">📉</span>;
                                                            if (hasMoneyIssues) return <span className="text-base leading-none cursor-help inline-flex items-center justify-center" title="Проблема: Некорректная цена/закупка">💸</span>;
                                                            if (hasZeroes) return <span className="text-base leading-none cursor-help inline-flex items-center justify-center" title="Инфо: Нулевой остаток">📦</span>;

                                                            return null;
                                                        })()}
                                                    </div>
                                                </SmartTableCell>
                                            );

                                            case 'name': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 font-medium text-sm', cellBorder, item.isFolder && 'text-blue-600')}>
                                                    <div className="flex items-center gap-2 pr-2 min-w-0 justify-between w-full">
                                                        {(() => {
                                                            const rawName = getDisplayName(item);
                                                            let cleanName = (rawName || '').replace(/\([^)]+\)/g, '').replace(/`.+?`/g, '').replace(/\|[^|]+\|/g, '').trim() || rawName;
                                                            let displayName = item.isFolder
                                                                ? (showWarehouseRawNames ? rawName : cleanName)
                                                                : rawName; // Товарам всегда оригинальное имя

                                                            const tooltipName = (!wordWrap || !showWarehouseRawNames) ? displayName : undefined;

                                                            if (!showWarehouseRawNames && showShortNames && item.isFolder) {
                                                                displayName = formatShortName(displayName);
                                                            }

                                                            return (
                                                                <span
                                                                    className={cn(
                                                                        "flex-1 min-w-0 text-foreground",
                                                                        wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto custom-scrollbar" : "truncate"
                                                                    )}
                                                                    title={tooltipName}
                                                                >
                                                                    {displayName}
                                                                </span>
                                                            );
                                                        })()}
                                                        {item.isFolder && <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50 text-blue-500 transition-transform group-hover:translate-x-1" />}
                                                    </div>
                                                </SmartTableCell>
                                            );

                                            case 'category': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-muted-foreground', cellBorder)}>
                                                    <div className={cn(
                                                        wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto max-w-full block custom-scrollbar" : "truncate max-w-full block"
                                                    )} title={!wordWrap && item.category ? item.category : undefined}>
                                                        {item.category || '—'}
                                                    </div>
                                                </SmartTableCell>
                                            );

                                            case 'skuCount': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right flex-1 truncate text-muted-foreground', cellBorder)}>
                                                    {item.isFolder ? <span className="text-muted-foreground font-normal" title="Уникальных карточек внутри">{item.skuCount ?? 0}</span> : <span className="text-muted-foreground opacity-50">—</span>}
                                                </SmartTableCell>
                                            );

                                            case 'stock': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right flex-1 truncate text-muted-foreground', cellBorder, (item.isFolder ? (item.totalStock ?? 0) : item.stock) < 0 ? 'text-red-500' : '')}>
                                                    {item.isFolder ? (
                                                        <span className={cn((item.totalStock ?? 0) < 0 || (item.minusesCount && item.minusesCount > 0) ? 'text-red-500' : 'text-foreground')} title="Суммарный остаток во всех подпапках">{item.totalStock ?? 0}</span>
                                                    ) : (
                                                        <span className={cn(item.stock < 0 || (item.minusesCount && item.minusesCount > 0) ? 'text-red-500' : 'text-foreground')}>{item.stock || 0}</span>
                                                    )}
                                                </SmartTableCell>
                                            );

                                            case 'totalValue': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right flex-1 truncate text-muted-foreground', cellBorder)}>
                                                    {item.totalValue !== undefined && item.totalValue !== null && item.totalValue !== 0 ? (
                                                        new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(item.totalValue).replace('₽', ' ₽')
                                                    ) : '—'}
                                                </SmartTableCell>
                                            );

                                            case 'zeroStockCount': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-1 font-medium', cellBorder)}>
                                                    {item.zeroStockCount ? <span className="text-gray-400 cursor-help" title="Товары с нулевым остатком">{item.zeroStockCount}</span> : null}
                                                </SmartTableCell>
                                            );

                                            case 'minusesCount': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-1 font-medium', cellBorder)}>
                                                    {item.minusesCount ? <span className="text-red-500 cursor-help" title="Товары с отрицательным остатком">{item.minusesCount}</span> : null}
                                                </SmartTableCell>
                                            );

                                            case 'moneyIssuesCount': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-1 font-medium', cellBorder)}>
                                                    {item.moneyIssuesCount ? <span className="text-red-500 cursor-help" title="Товары с нулевой ценой или стоимостью закупки">{item.moneyIssuesCount}</span> : null}
                                                </SmartTableCell>
                                            );

                                            case 'code': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-muted-foreground tabular-nums text-center', cellBorder)}>
                                                    {item.isFolder ? '—' : (item.code || '—')}
                                                </SmartTableCell>
                                            );
                                            case 'article': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-foreground text-center', cellBorder)}>
                                                    {item.isFolder ? '—' : (item.article || '—')}
                                                </SmartTableCell>
                                            );
                                            case 'barcode': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-muted-foreground tabular-nums text-center', cellBorder)}>
                                                    {item.isFolder ? '—' : (item.barcode || '—')}
                                                </SmartTableCell>
                                            );

                                            case 'purchase': {
                                                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                                                return (
                                                    <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right text-muted-foreground', cellBorder)}>
                                                        {item.isFolder ? '—' : (purchase > 0 ? new Intl.NumberFormat('ru-RU').format(purchase) : '0')}
                                                    </SmartTableCell>
                                                );
                                            }

                                            case 'price': {
                                                const price = item.price || 0;
                                                return (
                                                    <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right text-foreground font-medium', cellBorder)}>
                                                        {item.isFolder ? '—' : (price > 0 ? new Intl.NumberFormat('ru-RU').format(price) : '0')}
                                                    </SmartTableCell>
                                                );
                                            }

                                            case 'profit': {
                                                if (item.isFolder) return <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right text-muted-foreground', cellBorder)}>—</SmartTableCell>;
                                                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                                                const profit = (item.price || 0) - purchase;
                                                return (
                                                    <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right whitespace-nowrap', cellBorder, profit > 0 ? 'text-green-600' : profit <= 0 ? 'text-red-500' : 'text-muted-foreground')}>
                                                        {new Intl.NumberFormat('ru-RU').format(profit)}
                                                    </SmartTableCell>
                                                );
                                            }

                                            case 'margin': {
                                                if (item.isFolder) return <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right text-muted-foreground', cellBorder)}>—</SmartTableCell>;
                                                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                                                const profit = (item.price || 0) - purchase;
                                                const margin = item.price ? (profit / item.price) * 100 : 0;
                                                return (
                                                    <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right whitespace-nowrap', cellBorder, margin > 0 ? 'text-green-600' : margin <= 0 ? 'text-red-500' : 'text-muted-foreground')}>
                                                        {margin !== 0 ? `${margin.toFixed(1)}%` : '0%'}
                                                    </SmartTableCell>
                                                );
                                            }

                                            case 'roi': {
                                                if (item.isFolder) return <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right text-muted-foreground', cellBorder)}>—</SmartTableCell>;
                                                const purchase = item.purchase || item.cost || item.purchasePrice || 0;
                                                const profit = (item.price || 0) - purchase;
                                                const roi = purchase ? (profit / purchase) * 100 : 0;
                                                return (
                                                    <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right whitespace-nowrap', cellBorder, roi > 0 ? 'text-green-600' : roi <= 0 ? 'text-red-500' : 'text-muted-foreground')}>
                                                        {roi !== 0 ? `${roi.toFixed(1)}%` : '0%'}
                                                    </SmartTableCell>
                                                );
                                            }

                                            case 'sales': return (
                                                <SmartTableCell key={col.id} col={col} className={cn('px-2 text-sm text-right text-muted-foreground', cellBorder)}>
                                                    —
                                                </SmartTableCell>
                                            );

                                            default: return null;
                                        }
                                    })}

                                    {/* Spacer */}
                                    <TableCell className={cellBorder} />
                                </TableRow>
                            );
                        })}
                        {paginatedData.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={activeColumns.length + 1} className="h-24 text-center">
                                    Нет данных для отображения.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </table>
            </div>
        </div >
    );
}
