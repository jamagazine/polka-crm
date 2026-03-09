import { useMemo, useState, useCallback } from 'react';
import type { ColId, SortDir } from '../../../core/types/table';
import { type Master } from '../../../api/client';
import { smartDateMatch } from '../../../utils/smartDateMatch';
import { isSystemContact } from '../utils/masterHelpers';

export function useMastersLogic({
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
    showRawNames,
}: {
    masters: Master[];
    mastersFilter: 'all' | 'active' | 'archive';
    activeSearchCol: ColId | null;
    debouncedSearchTerm: string;
    seniorityFilter: string | null;
    showOnlySelected: boolean;
    selectedIds: Set<string>;
    dateRange: { start: Date | null; end: Date | null };
    currentPage: number;
    pageSize: number;
    showRawNames: boolean;
}) {
    const [sort, setSort] = useState<{ col: ColId; dir: SortDir } | null>({ col: 'name', dir: 'asc' });

    const toggleSort = useCallback((colId: ColId) => {
        setSort(prev => {
            if (prev?.col !== colId) return { col: colId, dir: 'asc' };
            if (prev.dir === 'asc') return { col: colId, dir: 'desc' };
            return null;
        });
    }, []);

    const getPlainValue = useCallback((row: Master, colId: string): any => {
        switch (colId) {
            case 'type':
                if (isSystemContact(row.name)) return 2;
                return row.isArchived ? 3 : 1;
            case 'status':
                return row.created;
            case 'name':
                return (showRawNames ? row.name : (row.cleanName || row.name)) || '—';
            case 'category':
                return (row as any).category || row.parsedCategory || '—';
            case 'phone':
                return row.parsedPhone || '—';
            case 'payment':
                return row.parsedPaymentMethod || '—';
            case 'bank':
                return row.parsedBanks || '—';
            case 'city':
                return row.parsedCity || row.address?.actual || '—';
            case 'date':
                return row.created;
            case 'notes':
                return row.parsedNotes || '—';
            default:
                return '';
        }
    }, [showRawNames]);

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

            if (showOnlySelected && selectedIds.size > 0) {
                if (!selectedIds.has(master._id)) return false;
            }

            if (activeSearchCol && debouncedSearchTerm) {
                const term = debouncedSearchTerm;

                if (activeSearchCol === 'date') {
                    const rawDate = master.created;
                    let ts = Number(rawDate);
                    if (isNaN(ts) && typeof rawDate === 'string') {
                        ts = new Date(rawDate).getTime();
                    } else if (ts > 0 && ts < 10000000000) {
                        ts = ts * 1000;
                    }
                    const formattedDate = (rawDate && !isNaN(ts)) ? new Date(ts).toLocaleDateString('ru-RU', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                    }) : String(rawDate || '—');

                    if (!smartDateMatch(formattedDate, term)) {
                        return false;
                    }
                } else {
                    const compareValue = getPlainValue(master, activeSearchCol);
                    if (!String(compareValue).toLowerCase().includes(term.toLowerCase())) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [masters, mastersFilter, activeSearchCol, debouncedSearchTerm, seniorityFilter, showOnlySelected, selectedIds, getPlainValue]);

    const filteredMasters = useMemo(() => {
        return baseFilteredMasters.filter(master => {
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
                const rangeEnd = dateRange.end.getTime() + 86399999;
                if (ts < rangeStart || ts > rangeEnd) return false;
            }

            return true;
        });
    }, [baseFilteredMasters, dateRange]);

    const sortedMasters = useMemo(() => {
        return [...filteredMasters].sort((a, b) => {
            if (!sort) return 0;

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

            let av: any = getPlainValue(a, sort.col);
            let bv: any = getPlainValue(b, sort.col);

            if (sort.col === 'name') {
                av = a.sortKey || av;
                bv = b.sortKey || bv;
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
    }, [filteredMasters, sort, getPlainValue]);

    const paginatedMasters = useMemo(() => {
        const pageStart = (currentPage - 1) * pageSize;
        return sortedMasters.slice(pageStart, pageStart + pageSize);
    }, [sortedMasters, currentPage, pageSize]);

    const getExportValue = useCallback((row: Master, colId: string, rowIndex: number): string | number => {
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
                if (!row.created) return '—';
                let ts = Number(row.created);
                if (isNaN(ts) && typeof row.created === 'string') {
                    ts = new Date(row.created).getTime();
                } else if (ts > 0 && ts < 10000000000) {
                    ts = ts * 1000;
                }
                if (!ts || isNaN(ts)) return '—';
                const days = Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
                if (days < 30) return `${days} дней`;
                if (days < 365) return `${Math.floor(days / 30)} мес`;
                const y = Math.floor(days / 365);
                const m = Math.floor((days % 365) / 30);
                return m > 0 ? `${y} г ${m} мес` : `${y} г`;
            }
            case 'category': return (row as any).category || row.parsedCategory || '—';
            case 'phone': return row.parsedPhone || '—';
            case 'payment': return row.parsedPaymentMethod || '—';
            case 'bank': return row.parsedBanks || '—';
            case 'city': return row.parsedCity || row.address?.actual || '—';
            case 'date': {
                if (!row.created) return '—';
                let ts = Number(row.created);
                if (isNaN(ts) && typeof row.created === 'string') ts = new Date(row.created).getTime();
                else if (ts > 0 && ts < 10000000000) ts = ts * 1000;
                return new Date(ts).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
            case 'notes': return row.parsedNotes || '—';
            default: return '';
        }
    }, [showRawNames]);

    return {
        baseFilteredMasters,
        filteredMasters,
        sortedMasters,
        paginatedMasters,
        sort,
        toggleSort,
        getExportValue
    };
}
