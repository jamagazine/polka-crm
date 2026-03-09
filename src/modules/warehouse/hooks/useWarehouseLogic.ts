import { useState, useMemo, useCallback } from 'react';
import type { ColId, SortDir } from '../../../core/types/table';
import type { WarehouseItem } from '../../../utils/parseCatalog';
import type { Master } from '../../../api/client';
import { getWarehouseDisplayName } from '../WarehousePage';

export interface UseWarehouseLogicParams {
    catalog: WarehouseItem[];
    viewMode: 'tree' | 'flat';
    currentFolderId: string | null;
    activeSearchCol: ColId | null;
    debouncedSearchTerm: string;
    effectiveSearchTerm: string;
    statusFilter: string | null;
    showOnlySelected: boolean;
    selectedIds: Set<string>;
    dateRange: { start: Date | null; end: Date | null; };
    masters: Master[];
    currentPage: number;
    pageSize: number;
    isProductView: boolean;
}

export function useWarehouseLogic({
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
}: UseWarehouseLogicParams) {
    const [sort, setSort] = useState<{ col: ColId; dir: SortDir } | null>({ col: 'name', dir: 'asc' });

    const toggleSort = useCallback((colId: ColId) => {
        setSort(prev => {
            if (prev?.col !== colId) return { col: colId, dir: 'asc' };
            if (prev.dir === 'asc') return { col: colId, dir: 'desc' };
            return null; // Сброс сортировки
        });
    }, []);

    const getDisplayName = useCallback((item: WarehouseItem) => {
        return getWarehouseDisplayName(item, currentFolderId);
    }, [currentFolderId]);

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

            if (dateRange.start && dateRange.end && item.isFolder && currentFolderId === null) {
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
                    if (!compareValue.toLowerCase().includes(effectiveSearchTerm)) return false;
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

        return result;
    }, [catalog, viewMode, currentFolderId, activeSearchCol, debouncedSearchTerm, effectiveSearchTerm, statusFilter, showOnlySelected, selectedIds, dateRange, masters]);

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
    }, [catalog, viewMode, currentFolderId, activeSearchCol, debouncedSearchTerm, effectiveSearchTerm, statusFilter, showOnlySelected, selectedIds]);

    const sortedData = useMemo(() => {
        const data = [...filteredData];
        if (!sort) {
            return data.sort((a, b) => {
                if (a.isFolder && !b.isFolder) return -1;
                if (!a.isFolder && b.isFolder) return 1;

                if (a.isFolder && b.isFolder) {
                    const aSystem = a.isSystem;
                    const bSystem = b.isSystem;
                    if (aSystem && !bSystem) return 1;
                    if (!aSystem && bSystem) return -1;
                }

                return getDisplayName(a).localeCompare(getDisplayName(b), 'ru');
            });
        }

        return data.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;

            if (sort.col !== 'type' && a.isFolder && b.isFolder) {
                const aSystem = a.isSystem;
                const bSystem = b.isSystem;
                if (aSystem && !bSystem) return 1;
                if (!aSystem && bSystem) return -1;
            }

            const isEmpty = (val: any) => val === null || val === undefined || val === '' || val === '—';
            let av: any, bv: any;

            switch (sort.col) {
                case 'type': {
                    const getTypePriority = (i: typeof a) => {
                        if (i.isFolder) {
                            if (i.isSystem) return 3;
                            if (i.hasSubfolders || (i.subFoldersCount && i.subFoldersCount > 0)) return 1;
                            return 2;
                        }
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
                case 'sales': av = 0; bv = 0; break;
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
                                return 10 + errorsCount;
                            } else if (hasMinuses) {
                                return 4;
                            } else if (hasMoneyIssues) {
                                return 3;
                            } else if (hasZeroes) {
                                return 2;
                            } else {
                                return 1;
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
    }, [filteredData, sort, getDisplayName, isProductView]);

    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        const end = currentPage * pageSize;
        return sortedData.slice(start, end);
    }, [sortedData, currentPage, pageSize]);

    const getExportValue = useCallback((row: any, colId: string, rowIndex: number) => {
        switch (colId) {
            case 'index': return rowIndex + 1;
            case 'name': {
                const rawName = getDisplayName(row);
                const cleanName = rawName.replace(/\([^)]+\)/g, '').replace(/\[[^\]]+\]/g, '').replace(/`.+?`/g, '').replace(/\|[^|]+\|/g, '').trim() || rawName;
                return row.isFolder ? cleanName : rawName;
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
    }, [getDisplayName]);

    return {
        filteredData,
        baseFilteredData,
        sortedData,
        paginatedData,
        sort,
        toggleSort,
        getDisplayName,
        getExportValue
    };
}
