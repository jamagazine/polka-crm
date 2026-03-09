import { useEffect, useState, useMemo, useRef } from 'react';
import { RefreshCw, Activity, User, Building2, UserMinus, CheckSquare, MinusSquare, Square, Clock, ExternalLink } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { useDebounce } from '../../hooks/useDebounce';
import { CSS } from '../../utils/cssVars';
import { Checkbox } from '../../components/ui/checkbox';
import { cn } from '../../components/ui/utils';
import { type SmartTableColDef, type SortDir } from '../../components/polka/SmartTable';
import { VirtualSmartTable } from '../../components/ui/VirtualSmartTable';
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

// getCellValue moved inside MastersPage component


// Removed duplicate SortIcon and SmartColHeader

// ─── Главный компонент ────────────────────────────────────────────────────────

export function MastersPage() {
    const {
        setRightFooterCards, activeRightCardId, setActiveRightCard, setMastersFilter,
        setHeaderContext, clearHeaderContext,
        setTotalPages, setTotalRows,
        masters, loadMasters,
        currentPage, setCurrentPage, pageSize,
        mastersFilter, mastersPrefs,
        selectedIds, toggleSelection, clearSelection, setSelection, setAllFilteredIds, setBaseFilteredIds,
        highlightedIds, clearHighlightedIds,
        mastersColumnOrder, setColumnOrder,
        setExportCallback,
        seniorityFilter, showOnlySelected, hiddenColumns, dateRange
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
        setBaseFilteredIds: state.setBaseFilteredIds,
        highlightedIds: state.highlightedIds,
        clearHighlightedIds: state.clearHighlightedIds,
        mastersColumnOrder: state.mastersColumnOrder as string[],
        setColumnOrder: state.setColumnOrder as (page: 'masters' | 'warehouse' | 'products', order: string[]) => void,
        setExportCallback: state.setExportCallback,
        seniorityFilter: state.seniorityFilter,
        showOnlySelected: state.showOnlySelected,
        hiddenColumns: state.hiddenColumns,
        dateRange: state.dateRange
    })));

    const { showRawNames, showShortNames, wordWrap } = mastersPrefs;

    const getCellValue = (row: Master, colId: string): any => {
        switch (colId) {
            case 'type': {
                if (isSystemContact(row.name)) {
                    return (
                        <div className="flex items-center justify-center w-full" title="Системный контакт">
                            <Building2 className="w-4 h-4 text-amber-500" />
                        </div>
                    );
                } else if (row.isArchived || (row as any).dateOfResignation) {
                    return (
                        <div className="flex items-center justify-center w-full" title="В архиве">
                            <div className="relative inline-flex items-center justify-center">
                                <UserMinus className="w-4 h-4 text-muted-foreground" />
                                <span className="absolute -bottom-1.5 -right-3 text-[9px] font-medium text-gray-500 leading-none bg-white/90 rounded px-0.5 border border-transparent">
                                    1
                                </span>
                            </div>
                        </div>
                    );
                } else {
                    return (
                        <div className="flex items-center justify-center w-full" title="Активный мастер">
                            <User className="w-4 h-4 text-blue-500" />
                        </div>
                    );
                }
            }
            case 'status': {
                const seniority = getSeniority(row);
                if (seniority) {
                    return (
                        <div className="flex items-center justify-center w-full cursor-help z-50" title={seniority.exactText}>
                            <span className="text-base leading-none">{seniority.icon}</span>
                        </div>
                    );
                }
                return '—';
            }
            case 'name': {
                const displayName = (showRawNames ? row.name : (row.cleanName || row.name)) || '—';
                return (
                    <div className="flex items-center gap-2 pr-2 min-w-0 justify-between w-full text-sm">
                        <span
                            title={row.name}
                            className={cn(
                                "flex-1 min-w-0 text-foreground",
                                wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto custom-scrollbar" : "truncate"
                            )}
                        >
                            {displayName}
                        </span>
                        <a
                            href={`https://web.cloudshop.ru/card/supplier/m/suppliers/show/${row._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex-shrink-0 opacity-50 hover:opacity-100 text-blue-500 transition-opacity"
                            title="Открыть карточку мастера в CloudShop"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                );
            }
            case 'category':
                return (row as any).category || row.parsedCategory || '—';
            case 'phone': {
                const phone = row.parsedPhone || '—';
                if (phone.includes('!!!')) {
                    return <span className="text-red-500 font-bold">{phone}</span>;
                }
                return phone;
            }
            case 'payment': return row.parsedPaymentMethod || '—';
            case 'bank': return row.parsedBanks || '—';
            case 'city': return row.parsedCity || row.address?.actual || '—';
            case 'date': return formatDate(row.created);
            case 'notes': return row.parsedNotes || '—';
            default: return null;
        }
    };


    const baseColumns: ColDef[] = useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <User className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Тип строки (Системный/Активный/Архив или Папка/Товар)'
        },
        {
            id: 'status', label: <Clock className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Состояние (Стаж или Диагностика ошибок)'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            sticky: true,
            width: showRawNames ? 'w-[500px]' : (!showRawNames && showShortNames ? 'w-[200px]' : 'w-[350px]'),
            minWidth: showRawNames ? 'min-w-[500px]' : (!showRawNames && showShortNames ? 'min-w-[200px]' : 'min-w-[350px]'),
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

    // Загрузка данных + синхронизация с API при каждом входе
    useEffect(() => {
        const init = async () => {
            // Загружаем из кэша, если данных нет
            if (masters.length === 0) {
                await loadMasters();
            }
            // Синхронизируем с API при каждом входе на страницу
            loadMasters(true);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    const baseFilteredMasters = useMemo(() => {
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

    const filteredMasters = useMemo(() => {
        return baseFilteredMasters.filter(master => {
            // ── Фильтр по календарному диапазону ──
            if (dateRange.start && dateRange.end) {
                if (!master.created) return false;
                let ts = Number(master.created);
                if (isNaN(ts) && typeof master.created === 'string') {
                    ts = new Date(master.created).getTime();
                } else if (ts > 0 && ts < 10000000000) {
                    ts = ts * 1000;
                }
                if (!ts || isNaN(ts)) return false;
                const rangeStart = dateRange.start.getTime();
                const rangeEnd = dateRange.end.getTime() + 86399999; // end of day
                if (ts < rangeStart || ts > rangeEnd) return false;
            }

            return true;
        });
    }, [baseFilteredMasters, dateRange]);

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

        // Special handling for numerical sorting of 'status' (which represents seniority/created date)
        if (sort.col === 'status') {
            const avRawStatus = a.created;
            const bvRawStatus = b.created;

            let av = Number(avRawStatus);
            if (isNaN(av) && typeof avRawStatus === 'string') av = new Date(avRawStatus).getTime();
            else if (av > 0 && av < 10000000000) av = av * 1000;

            let bv = Number(bvRawStatus);
            if (isNaN(bv) && typeof bvRawStatus === 'string') bv = new Date(bvRawStatus).getTime();
            else if (bv > 0 && bv < 10000000000) bv = bv * 1000;

            const aEmpty = !av || isNaN(av);
            const bEmpty = !bv || isNaN(bv);

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
            // Текстовая обёртка — без JSX, только строки и числа
            const getExportValue = (row: Master, colId: string, rowIndex: number): string | number => {
                switch (colId) {
                    case 'index': return rowIndex + 1;
                    case 'name': return (showRawNames ? row.name : (row.cleanName || row.name)) || '—';
                    case 'type': {
                        if (isSystemContact(row.name)) return 'Системный';
                        if (row.isArchived || (row as any).dateOfResignation) return 'Архив';
                        return 'Активный';
                    }
                    case 'contactTypeText': {
                        if (isSystemContact(row.name)) return 'Системный';
                        if (row.isArchived || (row as any).dateOfResignation) return 'Архив';
                        return 'Активный';
                    }
                    case 'status': {
                        const seniority = getSeniority(row);
                        return seniority ? seniority.exactText.replace('Стаж: ', '') : '—';
                    }
                    case 'category': return (row as any).category || row.parsedCategory || '—';
                    case 'phone': return row.parsedPhone || '—';
                    case 'payment': return row.parsedPaymentMethod || '—';
                    case 'bank': return row.parsedBanks || '—';
                    case 'city': return row.parsedCity || row.address?.actual || '—';
                    case 'date': return formatDate(row.created);
                    case 'notes': return row.parsedNotes || '—';
                    default: return '';
                }
            };
            const colsList = COLUMNS.map(c => {
                let textLabel = typeof c.label === 'string' ? c.label : '';
                if (c.id === 'type') textLabel = 'Тип';
                if (c.id === 'status') textLabel = 'Стаж';
                return { id: c.id as string, label: textLabel };
            });

            // Находим колонку "Тип", вырезаем её откуда бы то ни было, и ставим в самый конец.
            // Если её вдруг вообще нет в видимых (пользователь скрыл), мы всё равно её добавляем в конец (по требованию).
            const typeIndex = colsList.findIndex(c => c.id === 'type');
            if (typeIndex !== -1) {
                const [typeCol] = colsList.splice(typeIndex, 1);
                colsList.push(typeCol);
            } else {
                colsList.push({ id: 'type', label: 'Тип' });
            }

            // Переносим "Стаж" за "Дату регистрации" (date)
            const statusIndex = colsList.findIndex(c => c.id === 'status');
            if (statusIndex !== -1) {
                const [statusCol] = colsList.splice(statusIndex, 1);
                const dateIndex = colsList.findIndex(c => c.id === 'date');
                if (dateIndex !== -1) {
                    colsList.splice(dateIndex + 1, 0, statusCol); // Сразу после даты
                } else {
                    // Если даты нет в выгрузке, ставим перед Типом (который сейчас последний)
                    colsList.splice(colsList.length - 1, 0, statusCol);
                }
            }

            let filename = 'Мастера';
            if (activeRightCardId === 'all') filename = 'Все мастера';
            else if (activeRightCardId === 'archive') filename = 'Архивные мастера';

            exportSmartTable(sortedMastersRef.current, colsList, getExportValue as any, selectedIds, '_id', filename);
        };
        setExportCallback(exportFn);
        return () => setExportCallback(null);
    }, [COLUMNS, selectedIds, setExportCallback, showRawNames, activeRightCardId]);


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
    const baseIds = useMemo(() => baseFilteredMasters.map(m => m._id), [baseFilteredMasters]);

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

    // ── Фон для sticky-ячеек больше не нужен, он инкапсулирован в SmartTable.

    // ── Установка контекста шапки ──
    useEffect(() => {
        setHeaderContext(
            'Мастера',
            null,
            [{ id: 'refresh', icon: RefreshCw, label: 'Обновить', onClick: () => loadMasters() }],
            { onClick: () => { }, disabled: true }
        );
        return () => clearHeaderContext();
    }, [setHeaderContext, clearHeaderContext, loadMasters]);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* @ts-ignore - TS ColId mismatch */}
            <VirtualSmartTable
                data={paginatedMasters}
                activeColumns={COLUMNS as any}
                sort={sort as any}
                toggleSort={toggleSort as any}
                activeSearchCol={activeSearchCol as any}
                searchTerm={searchTerm}
                setSearchCol={setSearchCol as any}
                setSearchTerm={setSearchTerm}
                selectedIds={selectedIds}
                toggleSelection={toggleSelection}
                isAllVisibleSelected={isAllVisibleSelected}
                isAllFilteredSelected={isAllFilteredSelected}
                handleHeaderCheckClick={handleHeaderCheckClick}
                highlightedIds={highlightedIds}
                clearHighlightedIds={clearHighlightedIds}
                wordWrap={wordWrap}
                draggedColId={draggedColId as any}
                handleDragStart={handleDragStart as any}
                handleDragOver={handleDragOver as any}
                handleDragLeave={handleDragLeave as any}
                handleDrop={handleDrop as any}
                handleDragEnd={handleDragEnd as any}
                dragOverColId={dragOverColId as any}
                dropPosition={dropPosition as 'left' | 'right' | null}
                onRowClick={() => { }}
                getDisplayName={(item) => (showRawNames ? item.name : (item.cleanName || item.name)) || "—"}
                getCellValue={getCellValue as any}
                startIndex={(currentPage - 1) * pageSize}
            />
        </div>
    );
}

export default MastersPage;
