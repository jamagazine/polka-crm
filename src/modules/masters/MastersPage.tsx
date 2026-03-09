import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { RefreshCw, Activity, User, Building2, UserMinus, CheckSquare, MinusSquare, Square, Clock, ExternalLink, Folder } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { useDebounce } from '../../hooks/useDebounce';
import { CSS } from '../../utils/cssVars';
import { Checkbox } from '../../components/ui/checkbox';
import { cn } from '../../components/ui/utils';
import type { ColDef, ColId, SortDir } from '../../core/types/table';
import { type Master } from '../../api/client';
import { smartDateMatch } from '../../utils/smartDateMatch';
import { formatShortName } from '../../utils/nameFormatter';
import { exportSmartTable } from '../../utils/exportToExcel';
import { useMastersLogic } from './hooks/useMastersLogic';
import { isSystemContact } from './utils/masterHelpers';
import { useMastersColumns } from './config/mastersColumns';
import { MastersHeader } from './components/MastersHeader';
import { MastersTableContainer } from './components/MastersTableContainer';

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

// ─── Функция рендера ячеек таблицы ──────────────────────────────────────────

export function renderMasterCell(
    row: Master,
    colId: string,
    options: { showRawNames: boolean; wordWrap: boolean }
): any {
    const { showRawNames, wordWrap } = options;

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
}

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

    const baseColumns = useMastersColumns(!!showRawNames, !!showShortNames);

    // ─── Рендер ячеек (мемоизированный хук) ──────────────────────────────────
    const getCellValue = useCallback((row: Master, colId: string): React.ReactNode => {
        if (colId === 'selection') return null;

        switch (colId) {
            case 'index': return null;
            case 'type': {
                if (isSystemContact(row.name)) {
                    return <div className="flex items-center justify-center w-full"><Building2 className="w-4 h-4 text-blue-500" /></div>;
                }
                if (row.isArchived || (row as any).dateOfResignation) {
                    return <div className="flex items-center justify-center w-full"><UserMinus className="w-4 h-4 text-muted-foreground" /></div>;
                }
                return <div className="flex items-center justify-center w-full"><User className="w-4 h-4 text-green-500" /></div>;
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
    }, [showRawNames, wordWrap]);

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

    const [activeSearchCol, setSearchCol] = useState<ColId | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    const {
        baseFilteredMasters,
        filteredMasters,
        sortedMasters,
        paginatedMasters,
        sort,
        toggleSort,
        getExportValue: getExportValueHook
    } = useMastersLogic({
        masters,
        mastersFilter,
        activeSearchCol,
        debouncedSearchTerm,
        seniorityFilter,
        showOnlySelected,
        selectedIds,
        dateRange,
        currentPage,
        pageSize,
        showRawNames: !!showRawNames
    });

    // DND State

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
            // Загружаем из кэша (или API если кэш пуст), но без принудительной синхронизации
            await loadMasters();
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);










    // ── Регистрация callback экспорта для RightPanel ──
    const sortedMastersRef = useRef(sortedMasters);
    sortedMastersRef.current = sortedMasters;

    useEffect(() => {
        const exportFn = () => {
            const colsList = COLUMNS.map(c => {
                let textLabel = typeof c.label === 'string' ? c.label : '';
                if (c.id === 'type') textLabel = 'Тип';
                if (c.id === 'status') textLabel = 'Стаж';
                return { id: c.id as string, label: textLabel };
            });

            // Находим колонку "Тип", вырезаем её откуда бы то ни было, и ставим в самый конец.
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
                    colsList.splice(dateIndex + 1, 0, statusCol);
                } else {
                    colsList.splice(colsList.length - 1, 0, statusCol);
                }
            }

            let filename = 'Мастера';
            if (activeRightCardId === 'all') filename = 'Все мастера';
            else if (activeRightCardId === 'archive') filename = 'Архивные мастера';

            exportSmartTable(sortedMastersRef.current, colsList, getExportValueHook as any, selectedIds, '_id', filename);
        };
        setExportCallback(exportFn);
        return () => setExportCallback(null);
    }, [COLUMNS, selectedIds, setExportCallback, activeRightCardId, getExportValueHook]);


    // Логика хайлайта и автоскролла остается в странице
    useEffect(() => {
        if (highlightedIds.size > 0) {
            const timer = setTimeout(() => {
                clearHighlightedIds();
            }, 3000);

            const firstId = Array.from(highlightedIds)[0];
            if (firstId) {
                const index = sortedMasters.findIndex(item => item._id === firstId);
                if (index !== -1) {
                    const targetPage = Math.floor(index / pageSize) + 1;
                    if (targetPage !== currentPage) {
                        setCurrentPage(targetPage);
                    }
                }

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

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
            <MastersHeader
                masters={masters}
                filteredMasters={filteredMasters}
                pageSize={pageSize}
                loadMasters={loadMasters}
                setHeaderContext={setHeaderContext}
                clearHeaderContext={clearHeaderContext}
                setTotalRows={setTotalRows}
                setTotalPages={setTotalPages}
                setRightFooterCards={setRightFooterCards}
            />
            <MastersTableContainer
                paginatedMasters={paginatedMasters}
                COLUMNS={COLUMNS as any}
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
                showRawNames={!!showRawNames}
                getCellValue={getCellValue as any}
                startIndex={(currentPage - 1) * pageSize}
                filteredMasters={filteredMasters}
                baseFilteredMasters={baseFilteredMasters}
                setAllFilteredIds={setAllFilteredIds}
                setBaseFilteredIds={setBaseFilteredIds}
                setColumnOrder={setColumnOrder}
            />
        </div>
    );
}

export default MastersPage;
