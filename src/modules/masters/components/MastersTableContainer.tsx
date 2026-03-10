import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { VirtualSmartTable } from '../../../components/tables/VirtualSmartTable';
import type { ColDef, ColId, SortDir } from '../../../core/types/table';
import { type Master } from '../../../api/client';

interface MastersTableContainerProps {
    paginatedMasters: Master[];
    COLUMNS: ColDef[];
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
    showRawNames: boolean;
    getCellValue: (row: Master, colId: string) => any;
    startIndex: number;
    filteredMasters: Master[];
    baseFilteredMasters: Master[];
    setAllFilteredIds: (ids: string[]) => void;
    setBaseFilteredIds: (ids: string[]) => void;
    setColumnOrder: (page: 'masters' | 'warehouse' | 'products', order: string[]) => void;
}

export const MastersTableContainer = React.memo(function MastersTableContainer({
    paginatedMasters,
    COLUMNS,
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
    showRawNames,
    getCellValue,
    startIndex,
    filteredMasters,
    baseFilteredMasters,
    setAllFilteredIds,
    setBaseFilteredIds,
    setColumnOrder
}: MastersTableContainerProps) {

    // DND State
    const [draggedColId, setDraggedColId] = useState<string | null>(null);
    const [dragOverColId, setDragOverColId] = useState<string | null>(null);
    const [dropPosition, setDropPosition] = useState<'left' | 'right' | null>(null);

    // Checkbox logic
    const visibleIds = useMemo(() => paginatedMasters.map(m => m._id), [paginatedMasters]);
    const allFilteredIds = useMemo(() => filteredMasters.map(m => m._id), [filteredMasters]);
    const baseIds = useMemo(() => baseFilteredMasters.map(m => m._id), [baseFilteredMasters]);

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

        const currentIds = COLUMNS.map(c => c.id);
        const fromIndex = currentIds.indexOf(draggedColId as ColId);
        let toIndex = currentIds.indexOf(targetCol.id);

        if (fromIndex === -1 || toIndex === -1) return;

        if (dropPosition === 'right') {
            toIndex += 1;
        }

        let firstNonStickyIndex = 0;
        for (let i = 0; i < COLUMNS.length; i++) {
            if (COLUMNS[i].isDragDisabled) firstNonStickyIndex = i + 1;
        }
        toIndex = Math.max(toIndex, firstNonStickyIndex);

        const newOrder = [...currentIds];
        const [movedId] = newOrder.splice(fromIndex, 1);

        if (fromIndex < toIndex) {
            toIndex -= 1;
        }

        newOrder.splice(toIndex, 0, movedId);

        setColumnOrder('masters', newOrder);
        setDraggedColId(null);
        setDragOverColId(null);
        setDropPosition(null);
    }, [draggedColId, dropPosition, COLUMNS, setColumnOrder]);

    const handleDragEnd = useCallback(() => {
        document.body.classList.remove('dragging-column');
        setDraggedColId(null);
        setDragOverColId(null);
        setDropPosition(null);
    }, []);

    return (
        // @ts-ignore - TS ColId mismatch
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
            clearSelection={clearSelection}
            selectAllFiltered={() => setSelection(new Set(allFilteredIds))}
            allFilteredCount={allFilteredIds.length}
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
            startIndex={startIndex}
        />
    );
});
