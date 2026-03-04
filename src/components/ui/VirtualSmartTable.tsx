import React, { useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Package, Folder, FolderCog, FolderTree, ChevronRight, CheckSquare, MinusSquare, Square, TriangleAlert, Check } from 'lucide-react';
import { Checkbox } from './checkbox';
import { cn } from './utils';
import {
    SmartColHeader,
    SortIcon,
    type SmartTableColDef,
    type SortDir,
} from '../polka/SmartTable';

// ─── Типы ────────────────────────────────────────────────────────────────────

type ColId = 'index' | 'type' | 'status' | 'name' | 'category' | 'skuCount' | 'stock' | 'totalValue' | 'minusesCount' | 'moneyIssuesCount' | 'zeroStockCount' | 'code' | 'article' | 'barcode' | 'purchase' | 'price' | 'profit' | 'margin' | 'roi' | 'sales';

interface ColDef extends SmartTableColDef {
    id: ColId;
    label: string | React.ReactNode;
    sortable: boolean;
    searchable: boolean;
    sticky?: boolean;
}

export interface VirtualSmartTableProps {
    data: any[];
    activeColumns: ColDef[];
    sort: { col: ColId; dir: SortDir } | null;
    toggleSort: (colId: ColId) => void;
    activeSearchCol: ColId | null;
    searchTerm: string;
    setSearchCol: (col: ColId | null) => void;
    setSearchTerm: (term: string) => void;
    selectedIds: Set<string>;
    toggleSelection: (id: string) => void;
    isAllVisibleSelected: boolean;
    isAllFilteredSelected: boolean;
    handleHeaderCheckClick: () => void;
    highlightedIds: Set<string>;
    clearHighlightedIds: () => void;
    wordWrap: boolean;
    // DnD
    draggedColId: string | null;
    handleDragStart: (e: React.DragEvent, colId: string) => void;
    handleDragOver: (e: React.DragEvent, targetCol: ColDef) => void;
    handleDragLeave: (e: React.DragEvent) => void;
    handleDrop: (e: React.DragEvent, targetCol: ColDef) => void;
    handleDragEnd: () => void;
    dragOverColId: string | null;
    dropPosition: 'left' | 'right' | null;
    // Navigation
    onRowClick: (item: any, e: React.MouseEvent) => void;
    getDisplayName: (item: any) => string;
    formatShortName: (name: string) => string;
    getCellValue?: (item: any, colId: string) => any;
    startIndex?: number;
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

/** Парсит Tailwind-класс w-[Xpx] → "Xpx", иначе fallback */
function parseWidth(col: ColDef): string {
    const w = col.width || '';
    const m = w.match(/w-\[(.+?)\]/);
    if (m) return m[1];
    return '150px';
}

/** Создаём gridTemplateColumns из массива колонок + spacer */
function buildGridTemplate(columns: ColDef[]): string {
    return columns.map(c => parseWidth(c)).join(' ') + ' 1fr';
}

// ─── Константы стилей ────────────────────────────────────────────────────────

const FREEZE_SHADOW = 'shadow-[4px_0_8px_0_rgba(0,0,0,0.08)] border-r border-border';
const LEFT_BORDER_SHADOW = 'shadow-[-4px_0_8px_0_rgba(0,0,0,0.08)] border-l border-border';

function getStickyStyle(col: ColDef): React.CSSProperties {
    const style: React.CSSProperties = {};
    const isAlwaysSticky = col.sticky === true;
    const isRightSticky = !!col.stickyRight;

    if (isAlwaysSticky || isRightSticky) {
        style.position = 'sticky';
        style.zIndex = 20;
    }

    if (isAlwaysSticky && col.stickyLeft !== undefined) {
        style.left = col.stickyLeft;
    }

    if (isRightSticky && col.stickyRightOffset) {
        const m = col.stickyRightOffset.match(/right-\[?(\d+px)/);
        if (m) style.right = m[1];
    }

    return style;
}

function getHeaderStickyStyle(col: ColDef): React.CSSProperties {
    const style = getStickyStyle(col);
    if (style.position === 'sticky') {
        style.zIndex = 40;
    }
    return style;
}

// ─── VirtualRow (мемоизированный) ────────────────────────────────────────────

interface VirtualRowProps {
    item: any;
    index: number;
    activeColumns: ColDef[];
    isChecked: boolean;
    isHighlighted: boolean;
    selectedIds: Set<string>;
    toggleSelection: (id: string) => void;
    clearHighlightedIds: () => void;
    wordWrap: boolean;
    onRowClick: (item: any, e: React.MouseEvent) => void;
    onInternalRowClick: (item: any, e: React.MouseEvent) => void;
    getDisplayName: (item: any) => string;
    formatShortName: (name: string) => string;
    getCellValue?: (item: any, colId: string) => any;
    measureRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    gridTemplate: string;
    startIndex: number;
}

const cellBorder = 'border-b border-border';

const VirtualRow = React.memo(function VirtualRow({
    item,
    index,
    activeColumns,
    isChecked,
    isHighlighted,
    selectedIds,
    toggleSelection,
    clearHighlightedIds,
    wordWrap,
    onRowClick,
    onInternalRowClick,
    getDisplayName,
    formatShortName,
    getCellValue,
    measureRef,
    style,
    gridTemplate,
    startIndex,
}: VirtualRowProps) {
    const baseBg = 'bg-background';

    return (
        <div
            ref={measureRef}
            id={`row-${item._id}`}
            data-index={index}
            className={cn(
                'group grid items-stretch',
                isHighlighted && 'bg-amber-100/60 animate-pulse',
                isChecked && 'bg-primary/5 hover:bg-primary/10',
                !isChecked && !isHighlighted && 'hover:bg-muted/50',
                item.isFolder && selectedIds.size === 0 && 'hover:bg-blue-50/50 cursor-pointer',
                selectedIds.size > 0 && 'cursor-pointer',
            )}
            style={{ ...style, display: 'grid', gridTemplateColumns: gridTemplate }}
            data-state={isChecked ? 'selected' : undefined}
            onClick={(e) => onInternalRowClick(item, e)}
        >
            {activeColumns.map(col => {
                const stickyStyle = getStickyStyle(col);
                const isAlwaysSticky = col.sticky === true && !col.responsiveSticky;
                const isRightSticky = !!col.stickyRight;

                const stickyBgCn = (isAlwaysSticky || isRightSticky)
                    ? cn(baseBg, 'group-hover:bg-muted group-data-[state=selected]:bg-muted')
                    : '';

                const freezeCn = col.freezeEnd && isAlwaysSticky ? FREEZE_SHADOW : '';
                const leftBorderCn = col.leftBorder && isAlwaysSticky ? LEFT_BORDER_SHADOW : '';

                const baseCellCn = cn(
                    'flex items-center min-h-[44px]',
                    'border-b border-[var(--border)]',
                    col.align === 'center' && 'justify-center text-center',
                    col.align === 'right' && 'justify-end text-right',
                    stickyBgCn,
                    freezeCn,
                    leftBorderCn,
                );

                switch (col.id) {
                    case 'index': {
                        const customVal = getCellValue?.(item, col.id);
                        if (customVal !== undefined && customVal !== null && customVal !== '') {
                            return (
                                <div key={col.id} className={cn(baseCellCn, 'px-1')} style={stickyStyle}>
                                    {customVal}
                                </div>
                            );
                        }
                        return (
                            <div key={col.id} className={cn(baseCellCn, 'px-1')} style={stickyStyle}>
                                <div className="relative flex flex-col items-center justify-center w-full">
                                    <span className={cn(
                                        'text-xs text-muted-foreground select-none transition-opacity duration-100',
                                        isChecked ? 'opacity-0' : 'opacity-100 group-hover:opacity-0',
                                    )}>
                                        {startIndex + index + 1}
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
                                            aria-label={`Выбрать строку ${index + 1}`}
                                        />
                                    </span>
                                </div>
                            </div>
                        );

                    }

                    case 'type': {
                        const val = getCellValue?.(item, col.id);
                        return (
                            <div key={col.id} className={cn(baseCellCn, 'px-1')} style={stickyStyle}>
                                <div className="flex items-center justify-center relative w-full">
                                    {val || <Package className="w-4 h-4 text-slate-500" />}
                                </div>
                            </div>
                        );
                    }

                    case 'status': {
                        const val = getCellValue?.(item, col.id);
                        return (
                            <div key={col.id} className={cn(baseCellCn, 'px-0')} style={stickyStyle}>
                                <div className="flex flex-row items-center justify-center w-full">
                                    {val || <span title="Всё в порядке" className="cursor-help inline-flex items-center justify-center"><Check className="w-3.5 h-3.5 text-green-500/40" /></span>}
                                </div>
                            </div>
                        );
                    }

                    case 'name': {
                        const val = getCellValue?.(item, col.id);
                        return (
                            <div key={col.id} className={cn(baseCellCn, 'px-2 font-medium text-sm')} style={stickyStyle} title={item.name}>
                                {val || (
                                    <div className="flex items-center gap-2 pr-2 min-w-0 justify-between w-full">
                                        <span className={cn("flex-1 min-w-0 text-foreground", wordWrap ? "whitespace-pre-wrap break-words leading-tight py-1 max-h-[4.5rem] overflow-y-auto custom-scrollbar" : "truncate")} title={item.name}>
                                            {getDisplayName(item)}
                                        </span>
                                        {item.isFolder && <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50 text-blue-500 transition-transform group-hover:translate-x-1" />}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    case 'category': {
                        const val = getCellValue?.(item, col.id);
                        return (
                            <div key={col.id} className={cn(baseCellCn, 'px-2 text-sm text-muted-foreground')} style={stickyStyle}>
                                <div className={cn(
                                    wordWrap ? "whitespace-pre-wrap break-words py-1 max-h-[4.5rem] overflow-y-auto block custom-scrollbar" : "truncate block",
                                    "max-w-full w-full"
                                )} title={!wordWrap ? String(val || item.category || '—') : undefined}>
                                    {val || item.category || '—'}
                                </div>
                            </div>
                        );
                    }

                    default: {
                        if (getCellValue) {
                            const val = getCellValue(item, col.id);
                            const isPhoneWithAlert = (col.id as string) === 'phone' && String(val).startsWith('!!!');
                            return (
                                <div key={col.id} className={cn(baseCellCn, 'px-2 text-sm text-foreground', isPhoneWithAlert && 'text-red-500 font-bold')} style={stickyStyle}>
                                    <div className={cn(
                                        wordWrap ? "whitespace-pre-wrap break-words py-1 max-h-[4.5rem] overflow-y-auto block custom-scrollbar" : "truncate block",
                                        "max-w-full w-full"
                                    )} title={!wordWrap ? String(val) : undefined}>
                                        {val}
                                    </div>
                                </div>
                            );
                        }
                        return (
                            <div key={col.id} className={baseCellCn} style={stickyStyle}>
                                —
                            </div>
                        );
                    }
                }
            })}
            {/* Spacer */}
            <div className={cellBorder} />
        </div>
    );
});

// ─── Основной компонент ──────────────────────────────────────────────────────

export function VirtualSmartTable(props: VirtualSmartTableProps) {
    const {
        data,
        activeColumns,
        sort,
        toggleSort,
        activeSearchCol,
        searchTerm,
        setSearchCol,
        setSearchTerm,
        selectedIds,
        toggleSelection,
        isAllVisibleSelected,
        isAllFilteredSelected,
        handleHeaderCheckClick,
        highlightedIds,
        clearHighlightedIds,
        wordWrap,
        draggedColId,
        handleDragStart,
        handleDragOver,
        handleDragLeave,
        handleDrop,
        handleDragEnd,
        dragOverColId,
        dropPosition,
        onRowClick,
        getDisplayName,
        formatShortName,
        getCellValue,
        startIndex = 0,
    } = props;

    const scrollRef = useRef<HTMLDivElement>(null);

    const handleInternalRowClick = (item: any, e: React.MouseEvent) => {
        if (selectedIds.size > 0) {
            e.preventDefault();
            e.stopPropagation();
            toggleSelection(item._id);
        } else {
            onRowClick(item, e);
        }
    };


    const processedColumns = React.useMemo(() => {
        let currentLeft = 0;
        return activeColumns.map(col => {
            const isStickyTarget = ['index', 'type', 'status', 'name'].includes(col.id as string);
            if (isStickyTarget) {
                const newCol = { ...col, sticky: true, stickyLeft: `${currentLeft}px` };
                const wMatch = (col.width || '').match(/w-\[?(\d+)px\]?/);
                if (wMatch) {
                    currentLeft += parseInt(wMatch[1], 10);
                } else {
                    currentLeft += 150;
                }
                return newCol;
            }
            return { ...col, sticky: false, stickyLeft: undefined };
        });
    }, [activeColumns]);

    const gridTemplate = React.useMemo(() => buildGridTemplate(processedColumns), [processedColumns]);

    const virtualizer = useVirtualizer({
        count: data.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 45,
        overscan: 15,
        measureElement: (el) => {
            if (!el) return 45;
            return el.getBoundingClientRect().height;
        },
    });

    const virtualItems = virtualizer.getVirtualItems();
    const totalSize = virtualizer.getTotalSize();

    return (
        <div className="flex-1 w-full h-full flex flex-col">
            <div
                ref={scrollRef}
                className="flex-1 w-full h-full overflow-x-auto overflow-y-auto"
                style={{ contain: 'strict' }}
            >
                {/* ── Sticky Header ── */}
                <div
                    className="grid bg-background sticky top-0 z-30 min-w-[800px] border-b border-border"
                    style={{ gridTemplateColumns: gridTemplate, height: '50px' }}
                >
                    {processedColumns.map(col => {
                        const isDraggable = !col.isDragDisabled;
                        const isDragging = draggedColId === col.id;
                        const isDragOver = dragOverColId === col.id;
                        const isAlwaysSticky = col.sticky === true && !col.responsiveSticky;
                        const isRightSticky = !!col.stickyRight;
                        const stickyStyle = getHeaderStickyStyle(col);

                        return (
                            <div
                                key={col.id}
                                className={cn(
                                    'flex items-center px-2 text-foreground text-left font-medium whitespace-nowrap text-sm',
                                    col.align === 'center' && 'text-center justify-center',
                                    col.align === 'right' && 'text-right justify-end',
                                    isDragging && 'opacity-30',
                                    (isAlwaysSticky || isRightSticky) && 'bg-background',
                                    col.freezeEnd && isAlwaysSticky && FREEZE_SHADOW,
                                    col.leftBorder && isAlwaysSticky && LEFT_BORDER_SHADOW,
                                    isDragOver && dropPosition === 'left' && 'border-l-2 border-l-primary',
                                    isDragOver && dropPosition === 'right' && 'border-r-2 border-r-primary',
                                )}
                                style={stickyStyle}
                                title={col.tooltip}
                                draggable={isDraggable}
                                onDragStart={(e) => isDraggable && handleDragStart(e, col.id)}
                                onDragOver={(e) => isDraggable && handleDragOver(e, col)}
                                onDragLeave={isDraggable ? handleDragLeave : undefined}
                                onDrop={(e) => isDraggable && handleDrop(e, col)}
                                onDragEnd={isDraggable ? handleDragEnd : undefined}
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
                                            onChange: setSearchTerm,
                                        }}
                                    />
                                )}
                            </div>
                        );
                    })}
                    {/* Spacer */}
                    <div className="border-b border-border" />
                </div>

                {/* ── Virtual Body ── */}
                <div
                    className="relative min-w-[800px]"
                    style={{ height: `${totalSize}px` }}
                >
                    {virtualItems.map(virtualRow => {
                        const item = data[virtualRow.index];
                        if (!item) return null;
                        const isChecked = selectedIds.has(item._id);
                        const isHighlighted = highlightedIds.has(item._id);

                        return (
                            <VirtualRow
                                key={item._id}
                                item={item}
                                index={virtualRow.index}
                                activeColumns={processedColumns}
                                isChecked={isChecked}
                                isHighlighted={isHighlighted}
                                selectedIds={selectedIds}
                                toggleSelection={toggleSelection}
                                clearHighlightedIds={clearHighlightedIds}
                                wordWrap={wordWrap}
                                onRowClick={onRowClick}
                                onInternalRowClick={handleInternalRowClick}
                                getDisplayName={getDisplayName}
                                formatShortName={formatShortName}
                                getCellValue={getCellValue}
                                startIndex={startIndex}
                                measureRef={virtualizer.measureElement}
                                gridTemplate={gridTemplate}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    transform: `translateY(${virtualRow.start}px)`,
                                }}
                            />
                        );
                    })}
                </div>

                {/* ── Пустое состояние ── */}
                {data.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-muted-foreground text-sm min-w-[800px]">
                        Нет данных для отображения.
                    </div>
                )}
            </div>
        </div>
    );
}
