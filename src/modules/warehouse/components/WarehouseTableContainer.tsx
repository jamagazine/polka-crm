import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { VirtualSmartTable } from '../../../components/tables/VirtualSmartTable';
import type { ColDef, ColId, SortDir } from '../../../core/types/table';
import type { WarehouseItem } from '../../../utils/parseCatalog';

interface WarehouseTableContainerProps {
    paginatedData: WarehouseItem[];
    activeColumns: ColDef[];
    sort: { col: ColId; dir: SortDir } | null;
    toggleSort: (colId: ColId) => void;
    activeSearchCol: ColId | null;
    searchTerm: string;
    setSearchCol: (col: ColId | null) => void;
    setSearchTerm: (term: string) => void;
    selectedIds: Set<string>;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    setSelection: (ids: Set<string>) => void;
    highlightedIds: Set<string>;
    clearHighlightedIds: () => void;
    wordWrap: boolean;
    onRowClick: (item: any, e: React.MouseEvent) => void;
    getDisplayName: (item: WarehouseItem) => string;
    getCellValue: (item: WarehouseItem, colId: string) => any;
    startIndex: number;
    sortedData: WarehouseItem[];
    filteredData: WarehouseItem[];
    baseFilteredData: WarehouseItem[];
    setAllFilteredIds: (ids: string[]) => void;
    setBaseFilteredIds: (ids: string[]) => void;
    setColumnOrder: (page: 'masters' | 'warehouse' | 'products', order: string[]) => void;
}

export const WarehouseTableContainer = React.memo(function WarehouseTableContainer({
    paginatedData,
    activeColumns,
    sort,
    toggleSort,
    activeSearchCol,
    searchTerm,
    setSearchCol,
    setSearchTerm,
    selectedIds,
    toggleSelection,
    clearSelection,
    setSelection,
    highlightedIds,
    clearHighlightedIds,
    wordWrap,
    onRowClick,
    getDisplayName,
    getCellValue,
    startIndex,
    sortedData,
    filteredData,
    baseFilteredData,
    setAllFilteredIds,
    setBaseFilteredIds,
    setColumnOrder
}: WarehouseTableContainerProps) {

    // DND State
    const [draggedColId, setDraggedColId] = useState<string | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null);

    // Checkbox logic
    const visibleIds = useMemo(() => paginatedData.map(d => d._id), [paginatedData]);
    const allFilteredIds = useMemo(() => filteredData.map(d => d._id), [filteredData]);
    const baseIds = useMemo(() => baseFilteredData.map(d => d._id), [baseFilteredData]);

    // Sync filtered ids
    useEffect(() => {
        setAllFilteredIds(allFilteredIds);
        setBaseFilteredIds(baseIds);
    }, [allFilteredIds, baseIds, setAllFilteredIds, setBaseFilteredIds]);

    const isAllVisibleSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
    const isAllFilteredSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id));

    const handleHeaderCheckClick = useCallback(() => {
        if (isAllVisibleSelected) {
            // Uncheck all visible items
            const next = new Set(selectedIds);
            visibleIds.forEach(id => next.delete(id));
            setSelection(next);
        } else {
            // Check all visible items
            const next = new Set(selectedIds);
            visibleIds.forEach(id => next.add(id));
            setSelection(next);
        }
    }, [isAllVisibleSelected, setSelection, selectedIds, visibleIds]);

    // DND Handlers
    const handleDragStart = useCallback((e: React.DragEvent, colId: string) => {
        setDraggedColId(colId);
        e.dataTransfer.effectAllowed = 'move';
        document.body.classList.add('dragging-column');
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, targetCol: ColDef) => {
        e.preventDefault();
        if (!draggedColId || draggedColId === targetCol.id || targetCol.sticky === true) return;
        e.dataTransfer.dropEffect = 'move';
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const midPoint = rect.left + rect.width / 2;
        const pos = e.clientX < midPoint ? 'left' : 'right';
        setDragOverColId(targetCol.id);
        setDropPosition(pos);
    }, [draggedColId]);

    const handleDragLeave = useCallback(() => {
        setDragOverColId(null);
        setDropPosition(null);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetCol: ColDef) => {
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
    }, [draggedColId, dropPosition, activeColumns, setColumnOrder]);

    const handleDragEnd = useCallback(() => {
        document.body.classList.remove('dragging-column');
        setDraggedColId(null);
        setDragOverColId(null);
        setDropPosition(null);
    }, []);

    return (
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
            clearSelection={clearSelection}
            selectAllFiltered={() => setSelection(new Set(allFilteredIds))}
            allFilteredCount={allFilteredIds.length}
            handleHeaderCheckClick={handleHeaderCheckClick}
            highlightedIds={highlightedIds}
            clearHighlightedIds={clearHighlightedIds}
            wordWrap={wordWrap}
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
            startIndex={startIndex}
        />
    );
});
