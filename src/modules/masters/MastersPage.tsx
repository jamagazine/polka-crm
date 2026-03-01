import { useEffect, useState, useMemo, useRef } from 'react';
import { RefreshCw, Activity, User, Building2, UserMinus, Loader2, CheckSquare, MinusSquare, Square, Clock } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { useDebounce } from '../../hooks/useDebounce';
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
import { type Master } from '../../api/client';
import { smartDateMatch } from '../../utils/smartDateMatch';
import { formatShortName } from '../../utils/nameFormatter';
import { exportSmartTable } from '../../utils/exportToExcel';

// ─── Константы ────────────────────────────────────────────────────────────────

// Базовые системные контакты с точным учетом обратной кавычки
const BASE_SYSTEM_CONTACTS = [
    '`0_ПОСТАВЩИК по умолчанию',
    '`Клаудшоп CloudShop',
    '`Полка',
    '`ТЦ Союз'
];

function isSystemContact(name: string | undefined | null): boolean {
    if (!name) return false;
    const lowerName = name.toLowerCase();
    // Считаем системными те, что в базовом списке И те, что содержат 'полка'
    return BASE_SYSTEM_CONTACTS.includes(name) || lowerName.includes('полка');
}

const MASTERS_FILTERS = [
    { id: 'all', label: 'Все', shortLabel: 'ВСЕ', count: 0 },
    { id: 'active', label: 'Действующие', shortLabel: 'ДЕЙ', count: 0 },
    { id: 'archive', label: 'Архив', shortLabel: 'АРХ', count: 0 },
];
const MASTERS_HEADER_ACTIONS = [{ id: 'refresh', icon: RefreshCw, label: 'Обновить' }];

// ─── Конфигурация колонок ─────────────────────────────────────────────────────
//
//  Математика sticky-отступов:
//    col1 (#)      = 50px  → left: 0px
//    col2 (Статус) = 60px  → left: 50px  (= 50)
//    col3 (Имя)    = 200px → left: 110px (= 50+60)
//

type ColId = 'index' | 'type' | 'status' | 'name' | 'category' | 'phone' | 'payment' | 'bank' | 'city' | 'date' | 'notes';

interface ColDef extends SmartTableColDef {
    id: ColId;
    label: string | React.ReactNode;
    sortable: boolean;
    searchable: boolean;
    sticky?: boolean;
}

// ─── Вспомогательные функции ─────────────────────────────────────────────────

function getSeniority(master: Master): { icon: string; label: string; exactText: string; badge?: string } | null {
    if (!master.created) return null;
    let ts = Number(master.created);
    if (isNaN(ts) && typeof master.created === 'string') {
        ts = new Date(master.created).getTime();
    } else if (ts > 0 && ts < 10000000000) {
        ts = ts * 1000;
    }
    if (!ts || isNaN(ts)) return null;

    const effectiveLeaveDate = master.parsedLeaveDate || master.lastReturnDate || null;
    const isArchived = Boolean(master.isArchived || effectiveLeaveDate);

    const endTs = effectiveLeaveDate ? effectiveLeaveDate : Date.now();
    const days = Math.floor((endTs - ts) / (1000 * 60 * 60 * 24));

    if (days < 0) return null; // Защита от дат из будущего

    if (isArchived) {
        const leaveDateStr = effectiveLeaveDate ? formatDate(effectiveLeaveDate) : 'Неизвестно';
        return {
            icon: '🗄️',
            label: 'В архиве',
            exactText: `В архиве. Был с нами: ${days} дней (Ушел: ${leaveDateStr})`,
            badge: '1'
        };
    }

    let icon = '';
    let label = '';

    if (days <= 30) {
        icon = '🐣'; label = 'Новичок';
    } else if (days <= 365) {
        icon = '🏅'; label = 'Постоянный';
    } else if (days <= 365 * 3) {
        icon = '🏆'; label = 'Опытный';
    } else {
        icon = '👑'; label = 'Ветеран';
    }

    let exactText = '';
    let compactText = '';

    if (days < 30) compactText = `${days} дней`;
    else if (days < 365) compactText = `${Math.floor(days / 30)} мес`;
    else {
        const y = Math.floor(days / 365);
        const m = Math.floor((days % 365) / 30);
        compactText = m > 0 ? `${y} г ${m} мес` : `${y} г`;
    }

    exactText = `Стаж: ${compactText} (${days} дней)`;

    return { icon, label, exactText, badge: compactText };
}

function formatDate(iso?: string | number): string {
    if (!iso) return '—';
    try {
        let ts = iso;
        if (!isNaN(Number(iso))) {
            const num = Number(iso);
            if (num > 0 && num < 10000000000) {
                ts = num * 1000;
            } else {
                ts = num;
            }
        }
        return new Date(ts).toLocaleDateString('ru-RU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
        });
    } catch {
        return String(iso);
    }
}

function getCellValue(row: Master, colId: ColId): string {
    switch (colId) {
        case 'index': return '';
        case 'type': return row.type ?? '—';
        case 'status': return row.created ?? '—';
        case 'name': return row.name ?? '—';
        case 'category': return row.parsedCategory || '—';
        case 'phone': return row.parsedPhone || '—';
        case 'payment': return row.parsedPaymentMethod || '—';
        case 'bank': return row.parsedBanks || '—';
        case 'city': return row.parsedCity || row.address?.actual || '—';
        case 'date': return formatDate(row.created);
        case 'notes': return row.parsedNotes || '—';
        default: return '—';
    }
}

// Removed duplicate SortIcon and SmartColHeader

// ─── Скелетон загрузки ────────────────────────────────────────────────────────

function SkeletonRow({ idx }: { idx: number }) {
    const cellBorder = 'border-b border-border';

    return (
        <TableRow key={`skel-${idx}`} className="animate-pulse">
            {/* # */}
            <TableCell className={cn('px-1', cellBorder)}>
                <div className="h-3 w-4 mx-auto rounded bg-muted" />
            </TableCell>
            {/* Тип */}
            <TableCell className={cn('px-1', cellBorder)}>
                <div className="h-4 w-4 mx-auto rounded bg-muted" />
            </TableCell>
            {/* Статус/Стаж */}
            <TableCell className={cn('px-1', cellBorder)}>
                <div className="h-5 w-5 mx-auto rounded-full bg-muted" />
            </TableCell>
            {/* Имя */}
            <TableCell className={cn('px-2', cellBorder)}>
                <div className="h-3 w-32 rounded bg-muted" />
            </TableCell>
            {/* Остальные */}
            {Array.from({ length: 7 }).map((_, i) => (
                <TableCell key={`skel-col-${i}`} className={cn('px-2', cellBorder)}>
                    <div className="h-3 rounded bg-muted" style={{ width: `${50 + (i * 13) % 40}%` }} />
                </TableCell>
            ))}
            {/* Spacer */}
            <TableCell className={cellBorder} />
        </TableRow>
    );
}



// ─── Главный компонент ────────────────────────────────────────────────────────

export function MastersPage() {
    const {
        setRightFooterCards, activeRightCardId, setActiveRightCard, setMastersFilter,
        setHeaderContext, clearHeaderContext,
        setTotalPages, setTotalRows,
        masters, isLoading, loadMasters,
        currentPage, setCurrentPage, pageSize,
        mastersFilter, mastersPrefs,
        selectedIds, toggleSelection, clearSelection, setSelection, setAllFilteredIds,
        highlightedIds, clearHighlightedIds,
        mastersColumnOrder, setColumnOrder,
        setExportCallback,
        seniorityFilter, showOnlySelected, hiddenColumns
    } = usePanelStore(useShallow(state => ({
        setRightFooterCards: state.setRightFooterCards,
        activeRightCardId: state.activeRightCardId,
        setActiveRightCard: state.setActiveRightCard,
        setMastersFilter: state.setMastersFilter,
        setHeaderContext: state.setHeaderContext,
        clearHeaderContext: state.clearHeaderContext,
        setTotalPages: state.setTotalPages,
        setTotalRows: state.setTotalRows,
        masters: state.masters,
        isLoading: state.isLoading,
        loadMasters: state.loadMasters,
        currentPage: state.currentPage,
        setCurrentPage: state.setCurrentPage,
        pageSize: state.pageSize,
        mastersFilter: state.mastersFilter,
        mastersPrefs: state.mastersPrefs,
        selectedIds: state.selectedIds,
        toggleSelection: state.toggleSelection,
        clearSelection: state.clearSelection,
        setSelection: state.setSelection,
        setAllFilteredIds: state.setAllFilteredIds,
        highlightedIds: state.highlightedIds,
        clearHighlightedIds: state.clearHighlightedIds,
        mastersColumnOrder: state.mastersColumnOrder as string[],
        setColumnOrder: state.setColumnOrder as (page: 'masters' | 'warehouse' | 'products', order: string[]) => void,
        setExportCallback: state.setExportCallback,
        seniorityFilter: state.seniorityFilter,
        showOnlySelected: state.showOnlySelected,
        hiddenColumns: state.hiddenColumns
    })));

    const { showRawNames, showShortNames, wordWrap } = mastersPrefs;

    const baseColumns: ColDef[] = useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true, stickyLeft: 'left-0',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <User className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            responsiveSticky: true, stickyLeft: 'md:left-[50px]',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Тип строки (Системный/Активный/Архив или Папка/Товар)'
        },
        {
            id: 'status', label: <Clock className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            responsiveSticky: true, stickyLeft: 'md:left-[100px]',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Состояние (Стаж или Диагностика ошибок)'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            responsiveSticky: true, stickyLeft: 'md:left-[150px]',
            width: showRawNames ? 'w-[500px]' : (!showRawNames && showShortNames ? 'w-[250px]' : 'w-[385px]'),
            minWidth: showRawNames ? 'min-w-[500px]' : (!showRawNames && showShortNames ? 'min-w-[250px]' : 'min-w-[385px]'),
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Наименование позиции'
        },
        { id: 'category', label: 'Категория', sortable: true, searchable: true, width: 'w-[190px]', minWidth: 'min-w-[190px]', tooltip: 'Категория мастера' },
        { id: 'phone', label: 'Телефон', sortable: true, searchable: true, width: 'w-[190px]', minWidth: 'min-w-[190px]', align: 'center' },
        { id: 'payment', label: 'Оплата', sortable: true, searchable: true, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'center' },
        { id: 'bank', label: 'Банк', sortable: true, searchable: true, width: 'w-[175px]', minWidth: 'min-w-[175px]', align: 'center' },
        { id: 'city', label: 'Город', sortable: true, searchable: true, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'center' },
        { id: 'date', label: 'Дата рег.', sortable: true, searchable: true, width: 'w-[140px]', minWidth: 'min-w-[140px]', align: 'center', tooltip: 'Дата регистрации в системе' },
        { id: 'notes', label: 'Заметки', sortable: true, searchable: true, width: 'w-[250px]', minWidth: 'min-w-[250px]' },
    ], [showRawNames, showShortNames]);

    const COLUMNS: ColDef[] = useMemo(() => {
        const mastersHidden = hiddenColumns?.masters || [];
        const visibleBase = mastersHidden.length > 0
            ? baseColumns.filter(c => c.id === 'index' || !mastersHidden.includes(c.id))
            : baseColumns;

        let result: ColDef[];
        if (!mastersColumnOrder || mastersColumnOrder.length === 0) {
            result = visibleBase;
        } else {
            const ordered: ColDef[] = [];
            const baseMap = new Map(visibleBase.map(c => [c.id, c]));

            mastersColumnOrder.forEach(id => {
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
    }, [baseColumns, mastersColumnOrder, hiddenColumns]);

    const [sort, setSort] = useState<{ col: ColId; dir: SortDir } | null>({ col: 'name', dir: 'asc' });
    const [activeSearchCol, setSearchCol] = useState<ColId | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    // DND State
    const [draggedColId, setDraggedColId] = useState<string | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null);

    // Инициализация header / footer
    useEffect(() => {
        setHeaderContext('Мастера', 'Действующие мастера', [
            { id: 'refresh', icon: RefreshCw, label: 'Обновить', onClick: () => loadMasters(true) }
        ], { onClick: () => { }, disabled: true });
        setActiveRightCard('active');
        return () => { setRightFooterCards([]); clearHeaderContext(); setActiveRightCard(''); };
    }, [setRightFooterCards, setHeaderContext, clearHeaderContext, loadMasters, setActiveRightCard]);

    // Синхронизация кликов по карточкам с фильтром
    useEffect(() => {
        if (activeRightCardId && ['all', 'active', 'archive'].includes(activeRightCardId)) {
            setMastersFilter(activeRightCardId as 'all' | 'active' | 'archive');
        }
    }, [activeRightCardId, setMastersFilter]);

    // Загрузка данных
    useEffect(() => {
        if (masters.length === 0) {
            loadMasters();
        } else {
            // Temporary debug: log all master names exactly as they are in the DB
            console.log("--- EXACT MASTER NAMES (Copy these to see if there are hidden spaces) ---");
            masters.forEach(m => console.log(`'${m.name}'`));
            console.log("-----------------------------------------------------------------");
        }
    }, [masters, loadMasters]);


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

    // DND Handlers
    const handleDragStart = (e: React.DragEvent, colId: string) => {
        setDraggedColId(colId);
        e.dataTransfer.effectAllowed = 'move';
        // Add a class to the body to change cursor during drag
        document.body.classList.add('dragging-column');
    };

    const handleDragOver = (e: React.DragEvent, targetCol: ColDef) => {
        e.preventDefault();
        if (!draggedColId || draggedColId === targetCol.id || targetCol.sticky === true) return;

        e.dataTransfer.dropEffect = 'move';

        // Determine whether dropping to the left or right of the target column
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

        const currentIds = COLUMNS.map(c => c.id);
        const fromIndex = currentIds.indexOf(draggedColId as ColId);
        let toIndex = currentIds.indexOf(targetCol.id);

        if (fromIndex === -1 || toIndex === -1) return;

        // Adjust toIndex based on drop position relative to element
        if (dropPosition === 'right') {
            toIndex += 1;
        }

        // Ensure index doesn't go below the last sticky column
        let firstNonStickyIndex = 0;
        for (let i = 0; i < COLUMNS.length; i++) {
            if (COLUMNS[i].isDragDisabled) firstNonStickyIndex = i + 1;
        }
        toIndex = Math.max(toIndex, firstNonStickyIndex);

        // Calculate new order
        const newOrder = [...currentIds];
        const [movedId] = newOrder.splice(fromIndex, 1);

        // Adjust toIndex after removing the element if moving element left to right
        if (fromIndex < toIndex) {
            toIndex -= 1;
        }

        newOrder.splice(toIndex, 0, movedId);

        setColumnOrder('masters', newOrder);
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

    const toggleSort = (colId: ColId) =>
        setSort(prev => {
            if (prev?.col !== colId) return { col: colId, dir: 'asc' };
            if (prev.dir === 'asc') return { col: colId, dir: 'desc' };
            return null; // Сброс сортировки
        });

    const filteredMasters = useMemo(() => {
        return masters.filter(master => {
            const isSys = isSystemContact(master.name);
            const isArchived = isSys ? false : !!master.isArchived;

            let visible = true;
            if (mastersFilter === 'active') {
                const lowerName = (master.name || '').toLowerCase();
                const isPolkaRelated = lowerName.includes('полка');

                if (isSys) {
                    visible = isPolkaRelated;
                } else {
                    visible = !isArchived;
                }
            } else if (mastersFilter === 'archive') {
                visible = isArchived;
            }

            if (!visible) return false;

            // ── Фильтр по стажу ──
            if (seniorityFilter && master.created) {
                let ts = Number(master.created);
                if (isNaN(ts) && typeof master.created === 'string') {
                    ts = new Date(master.created).getTime();
                } else if (ts > 0 && ts < 10000000000) {
                    ts = ts * 1000;
                }
                if (!ts || isNaN(ts)) return false;

                const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
                if (seniorityFilter === 'newbie' && days > 30) return false;
                if (seniorityFilter === 'regular' && (days <= 30 || days > 365)) return false;
                if (seniorityFilter === 'expert' && (days <= 365 || days > 1095)) return false;
                if (seniorityFilter === 'veteran' && days <= 1095) return false;
            } else if (seniorityFilter && !master.created) {
                return false;
            }

            // ── Фильтр "Только выделенные" ──
            if (showOnlySelected && selectedIds.size > 0) {
                if (!selectedIds.has(master._id)) return false;
            }

            if (activeSearchCol && debouncedSearchTerm) {
                const term = debouncedSearchTerm;
                const compareValue = getCellValue(master, activeSearchCol);

                if (activeSearchCol === 'date') {
                    if (!smartDateMatch(compareValue, term)) {
                        return false;
                    }
                } else {
                    if (!compareValue.toLowerCase().includes(term.toLowerCase())) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [masters, mastersFilter, activeSearchCol, debouncedSearchTerm, seniorityFilter, showOnlySelected, selectedIds]);

    // Обновляем счетчики только когда меняется отфильтрованный массив
    useEffect(() => {
        setTotalRows(filteredMasters.length);
        setTotalPages(Math.ceil(filteredMasters.length / pageSize) || 1);

        // Подсчет статистики для футера всегда идет по 'ALL' массиву, 
        // чтобы карточки отображали корректные цифры независимо от текущего активного фильтра.
        const allCount = masters.length;
        const archiveCount = masters.filter(m => {
            const isSys = isSystemContact(m.name);
            return isSys ? false : !!m.isArchived;
        }).length;
        const activeCount = allCount - archiveCount;

        setRightFooterCards([
            {
                id: 'all', label: 'Все', shortLabel: 'ВСЕ', count: allCount,
                customCount: <span className="font-bold text-sm">{allCount.toLocaleString('ru-RU')}</span>
            },
            {
                id: 'active', label: 'Действующие', shortLabel: 'ДЕЙ', count: activeCount,
                customCount: <span className="font-bold text-sm">{activeCount.toLocaleString('ru-RU')}</span>
            },
            {
                id: 'archive', label: 'Архив', shortLabel: 'Архив', count: archiveCount,
                customCount: <span className="font-bold text-sm">{archiveCount.toLocaleString('ru-RU')}</span>
            },
        ]);
    }, [filteredMasters.length, masters, pageSize, setTotalRows, setTotalPages, setRightFooterCards]);



    // 2. Сортировка отфильтрованного списка
    const sortedMasters = [...filteredMasters].sort((a, b) => {
        if (!sort) return 0;
        const avRaw = getCellValue(a, sort.col);
        const bvRaw = getCellValue(b, sort.col);

        // Special handling for numerical sorting of 'status' (which returns 'created' timestamp)
        if (sort.col === 'status') {
            const av = Number(avRaw);
            const bv = Number(bvRaw);
            const aEmpty = isNaN(av);
            const bEmpty = isNaN(bv);

            if (aEmpty && bEmpty) return 0;
            if (aEmpty) return 1;
            if (bEmpty) return -1;

            return sort.dir === 'asc' ? av - bv : bv - av;
        }

        let av: any = avRaw;
        let bv: any = bvRaw;

        if (sort.col === 'type') {
            const isSysA = isSystemContact(a.name);
            const isSysB = isSystemContact(b.name);
            av = isSysA ? 2 : (a.isArchived ? 3 : 1);
            bv = isSysB ? 2 : (b.isArchived ? 3 : 1);
        } else if (sort.col === 'name') {
            av = a.sortKey || avRaw;
            bv = b.sortKey || bvRaw;
        }

        const isEmpty = (val: string) => val === null || val === undefined || val === '' || val === '—';
        const aEmpty = isEmpty(av);
        const bEmpty = isEmpty(bv);

        if (aEmpty && bEmpty) return 0;
        if (aEmpty) return 1;
        if (bEmpty) return -1;

        let comparison = String(av).localeCompare(String(bv), 'ru', { numeric: true });
        if (comparison === 0) {
            comparison = String(a.name || '').localeCompare(String(b.name || ''), 'ru');
        }

        return sort.dir === 'asc' ? comparison : -comparison;
    });

    // ── Регистрация callback экспорта для RightPanel ──
    const sortedMastersRef = useRef(sortedMasters);
    sortedMastersRef.current = sortedMasters;

    useEffect(() => {
        const exportFn = () => {
            const cols = COLUMNS
                .filter(c => typeof c.label === 'string')
                .map(c => ({ id: c.id, label: c.label as string }));
            exportSmartTable(sortedMastersRef.current, cols, getCellValue as any, selectedIds, '_id', 'Мастера');
        };
        setExportCallback(exportFn);
        return () => setExportCallback(null);
    }, [COLUMNS, selectedIds, setExportCallback]);


    // ── Автоскролл и переключение страницы для поиска ──
    useEffect(() => {
        if (highlightedIds.size > 0) {
            const timer = setTimeout(() => {
                clearHighlightedIds();
            }, 3000);

            const firstId = Array.from(highlightedIds)[0];
            if (firstId) {
                // Находим на какой странице этот элемент
                const index = sortedMasters.findIndex(item => item._id === firstId);
                if (index !== -1) {
                    const targetPage = Math.floor(index / pageSize) + 1;
                    if (targetPage !== currentPage) {
                        setCurrentPage(targetPage);
                    }
                }

                // Ждем рендера списка на новой странице
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

    // 3. Клиентская пагинация
    const pageStart = (currentPage - 1) * pageSize;
    const paginatedMasters = sortedMasters.slice(pageStart, pageStart + pageSize);

    // Логика состояния чекбокса в заголовке
    const visibleIds = useMemo(() => paginatedMasters.map(m => m._id), [paginatedMasters]);
    const allFilteredIds = useMemo(() => filteredMasters.map(m => m._id), [filteredMasters]);

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

    return (
        <div className="-mx-6 -my-6 w-[calc(100%+3rem)] h-[calc(100%+3rem)] flex flex-col overflow-hidden">

            {/*
             * Единственный scroll-контейнер.
             */}
            <div className="flex-1 overflow-x-auto overflow-y-auto">
                <table className="table-fixed min-w-[800px] w-full caption-bottom text-sm border-separate border-spacing-0">

                    {/* ══ Шапка ══ */}
                    <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30 h-[50px]">
                            {COLUMNS.map(col => {
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
                                        ) : col.id === 'status' ? (
                                            <button
                                                onClick={() => toggleSort('status')}
                                                className="flex items-center justify-center gap-1 w-full cursor-pointer hover:text-foreground transition-colors"
                                                title="Сортировать по типу"
                                            >
                                                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                                                <SortIcon
                                                    active={sort?.col === 'status'}
                                                    dir={sort?.col === 'status' ? sort.dir : null}
                                                />
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

                    {/* ══ Тело ══ */}
                    <TableBody>
                        {isLoading
                            ? Array.from({ length: 8 }, (_, i) => <SkeletonRow key={i} idx={i} />)
                            : paginatedMasters.map((master, idx) => {
                                // Глобальный номер строки с учётом текущей страницы
                                const globalIdx = pageStart + idx;
                                const isChecked = selectedIds.has(master._id);
                                const isHighlighted = highlightedIds.has(master._id);

                                return (
                                    <TableRow
                                        key={master._id}
                                        id={`row-${master._id}`}
                                        className={cn(
                                            'group',
                                            isHighlighted && 'bg-amber-100/60 animate-pulse',
                                            isChecked && 'bg-primary/5 hover:bg-primary/10',
                                            selectedIds.size > 0 && 'cursor-pointer hover:bg-muted/50'
                                        )}
                                        onClick={() => {
                                            if (isHighlighted) clearHighlightedIds();
                                            if (selectedIds.size > 0) {
                                                toggleSelection(master._id);
                                            }
                                        }}
                                        data-state={isChecked ? 'selected' : undefined}
                                    >
                                        {COLUMNS.map(col => {
                                            const cellBorder = 'border-b border-border';

                                            // ── Колонка #/Checkbox ──
                                            if (col.id === 'index') {
                                                return (
                                                    <SmartTableCell
                                                        key="index"
                                                        col={col}
                                                        className={cn('px-1', cellBorder)}
                                                    >
                                                        <div className="relative flex items-center justify-center h-5">
                                                            <span className={cn(
                                                                'text-xs text-muted-foreground select-none transition-opacity duration-100',
                                                                isChecked ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
                                                            )}>
                                                                {globalIdx + 1}
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
                                                                    onCheckedChange={() => toggleSelection(master._id)}
                                                                    aria-label={`Выбрать строку ${idx + 1}`}
                                                                />
                                                            </span>
                                                        </div>
                                                    </SmartTableCell>
                                                );
                                            }

                                            // ── Колонка Тип (ранее Статус) ──
                                            if (col.id === 'type') {
                                                const isSys = isSystemContact(master.name);
                                                const isArchived = Boolean(master.isArchived); // Здесь берем реальный статус для иконки

                                                let IconComponent = User;
                                                let iconClass = "w-4 h-4 text-green-500";
                                                let title = "Действующий мастер";

                                                if (isSys) {
                                                    IconComponent = Building2;
                                                    iconClass = "w-4 h-4 text-blue-500";
                                                    title = "Системный контакт / Поставщик";
                                                } else if (isArchived) {
                                                    IconComponent = UserMinus;
                                                    iconClass = "w-4 h-4 text-muted-foreground opacity-70";
                                                    title = "Мастер в архиве";
                                                }

                                                return (
                                                    <SmartTableCell
                                                        key="type"
                                                        col={col}
                                                        className={cn('px-1', cellBorder)}
                                                    >
                                                        <div className="flex items-center justify-center w-full h-full">
                                                            <div className="relative inline-flex items-center justify-center">
                                                                <span title={title} className="inline-flex items-center justify-center cursor-help">
                                                                    <IconComponent className={iconClass} />
                                                                </span>
                                                                {isArchived && !isSys && (
                                                                    <span
                                                                        className="absolute -bottom-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-secondary-foreground shadow-sm cursor-help"
                                                                        title="Общий стаж (за вычетом перерывов): В разработке"
                                                                    >
                                                                        1
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </SmartTableCell>
                                                );
                                            }

                                            // ── Колонка Статус (бывшая Стаж) ──
                                            if (col.id === 'status') {
                                                const sen = getSeniority(master);
                                                return (
                                                    <SmartTableCell
                                                        key="status"
                                                        col={col}
                                                        className={cn('px-1', cellBorder)}
                                                    >
                                                        <div className="flex items-center justify-center w-full h-full text-base leading-none">
                                                            {sen ? (
                                                                <span title={sen.exactText} className="cursor-help inline-flex items-center justify-center">
                                                                    {sen.icon}
                                                                </span>
                                                            ) : (
                                                                <span className="text-muted-foreground text-sm inline-flex items-center justify-center">—</span>
                                                            )}
                                                        </div>
                                                    </SmartTableCell>
                                                );
                                            }

                                            // ── Колонка Наименование ──
                                            if (col.id === 'name') {
                                                const rawName = master.name ?? '—';
                                                let displayName = showRawNames
                                                    ? rawName
                                                    : (master.cleanName || rawName);

                                                const tooltipName = (!wordWrap || !showRawNames) ? displayName : undefined;

                                                if (!showRawNames && showShortNames) {
                                                    displayName = formatShortName(displayName);
                                                }

                                                return (
                                                    <SmartTableCell
                                                        key="name"
                                                        col={col}
                                                        className={cn('px-2 font-medium text-sm', cellBorder)}
                                                    >
                                                        <div className={cn(
                                                            wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto max-w-full block custom-scrollbar" : "truncate max-w-full block"
                                                        )} title={tooltipName}>
                                                            {displayName}
                                                        </div>
                                                    </SmartTableCell>
                                                );
                                            }

                                            // ── Прочие (нестики) ──
                                            const value = getCellValue(master, col.id);

                                            if (col.id === 'phone' && value.startsWith('!!!')) {
                                                const phoneText = value.replace(/^!!!\s*/, '');
                                                return (
                                                    <SmartTableCell
                                                        key={col.id}
                                                        col={col}
                                                        className={cn('px-2 text-sm font-medium text-red-500', cellBorder)}
                                                    >
                                                        {phoneText}
                                                    </SmartTableCell>
                                                );
                                            }

                                            return (
                                                <SmartTableCell
                                                    key={col.id}
                                                    col={col}
                                                    className={cn('px-2 text-sm text-muted-foreground', cellBorder)}
                                                >
                                                    <div className={cn(
                                                        wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto max-w-full block custom-scrollbar" : "truncate max-w-full block"
                                                    )} title={!wordWrap && value !== '—' ? value : undefined}>
                                                        {value !== '—' ? value : ''}
                                                    </div>
                                                </SmartTableCell>
                                            );
                                        })}
                                        {/* Spacer */}
                                        <TableCell className="border-b border-border" />
                                    </TableRow>
                                );
                            })
                        }
                    </TableBody>
                </table>
            </div>
        </div>
    );
}
