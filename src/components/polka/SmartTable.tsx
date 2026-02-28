import * as React from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown, Search, X, GripVertical } from 'lucide-react';
import { Input } from '../ui/input';
import { cn } from '../ui/utils';
import { TableHead, TableCell } from '../ui/table';
import { CSS } from '../../utils/cssVars';

export type SortDir = 'asc' | 'desc';

export function SortIcon({ active, dir }: { active: boolean; dir: SortDir | null }) {
    const cls = 'w-3 h-3 flex-none transition-all';
    if (!active || !dir) return <ArrowUpDown className={cn(cls, 'text-muted-foreground opacity-35')} />;
    if (dir === 'asc') return <ArrowUp className={cn(cls, 'text-foreground')} />;
    return <ArrowDown className={cn(cls, 'text-foreground')} />;
}

export function SmartColHeader({
    colLabel,
    colAlign,
    isSortable,
    isSearchable,
    isDragDisabled,
    isSortActive,
    sortDir,
    onSortToggle,
    isSearching,
    onSearchOpen,
    onSearchClose,
    searchProps
}: {
    colLabel: React.ReactNode;
    colAlign?: 'left' | 'center' | 'right';
    isSortable?: boolean;
    isSearchable?: boolean;
    isDragDisabled?: boolean;
    isSortActive: boolean;
    sortDir: SortDir | null;
    onSortToggle: () => void;
    isSearching: boolean;
    onSearchOpen: () => void;
    onSearchClose: () => void;
    searchProps: { value: string; onChange: (v: string) => void; };
}) {
    if (isSearching) {
        return (
            <div className="flex items-center gap-1 w-full">
                <Input
                    className="h-7 text-xs flex-1"
                    placeholder="Поиск..."
                    autoFocus
                    value={searchProps.value}
                    onChange={(e) => searchProps.onChange(e.target.value)}
                />
                <button
                    onClick={onSearchClose}
                    className="flex-none w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                    title="Закрыть"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    const alignmentClass = colAlign === 'right' ? 'justify-end' : (colAlign === 'center' ? 'justify-center' : 'justify-between');

    return (
        <div className={cn("flex items-center gap-1 w-full min-w-0 group/header", alignmentClass)}>
            {!isDragDisabled && (
                <div className="flex-none w-4 h-4 text-muted-foreground/30 group-hover/header:text-muted-foreground/80 cursor-grab active:cursor-grabbing transition-colors hidden sm:flex items-center justify-center">
                    <GripVertical className="w-3.5 h-3.5" />
                </div>
            )}
            <button
                onClick={isSortable ? onSortToggle : undefined}
                className={cn(
                    'flex items-center gap-1 text-xs font-medium min-w-0 transition-colors w-full',
                    colAlign === 'center' ? 'justify-center' : '',
                    isSortable ? 'cursor-pointer hover:text-foreground hover:underline underline-offset-2' : 'cursor-default'
                )}
                tabIndex={isSortable ? 0 : -1}
                title={typeof colLabel === 'string' ? (isSortable ? `Сортировать: ${colLabel}` : colLabel) : undefined}
            >
                <span className={cn(typeof colLabel === 'string' && "truncate", "flex-1")}>
                    {colLabel}
                </span>
                {isSortable && <SortIcon active={isSortActive} dir={sortDir} />}
            </button>

            {isSearchable && (
                <button
                    onClick={onSearchOpen}
                    className="flex-none w-6 h-6 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    title={`Поиск: ${colLabel}`}
                >
                    <Search className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}

export interface SmartTableColDef {
    sticky?: boolean;
    responsiveSticky?: boolean;
    stickyLeft?: string;
    stickyRight?: boolean;
    stickyRightOffset?: string;
    leftBorder?: boolean;
    align?: 'center' | 'left' | 'right';
    width?: string;
    minWidth?: string;
    maxWidth?: string;
    freezeEnd?: boolean;
    isDragDisabled?: boolean;
    tooltip?: string;
}

const FREEZE_SHADOW = 'shadow-[6px_0_12px_-4px_rgba(0,0,0,0.15)] border-r-2 border-border/50';
const LEFT_BORDER_SHADOW = 'shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.15)] border-l-2 border-border/50';

interface SmartTableHeadProps extends React.ComponentProps<typeof TableHead> {
    col: SmartTableColDef;
    isDropTarget?: boolean;
    dropPosition?: 'left' | 'right' | null;
}

export function SmartTableHead({ col, className, style, isDropTarget, dropPosition, ...props }: SmartTableHeadProps) {
    const isAlwaysSticky = col.sticky === true && !col.responsiveSticky;
    const isMdSticky = col.responsiveSticky === true;
    const isRightSticky = !!col.stickyRight;

    return (
        <TableHead
            className={cn(
                className,
                col.align === 'center' && 'text-center',
                col.align === 'right' && 'text-right',
                // Width limits
                col.width,
                col.minWidth,
                col.maxWidth,
                // Sticky logic
                isAlwaysSticky && 'sticky z-20',
                isMdSticky && 'md:sticky md:z-20',
                isRightSticky && 'sticky z-20',
                // Offsets
                (isAlwaysSticky || isMdSticky) && col.stickyLeft,
                isRightSticky && col.stickyRightOffset,
                // Borders
                'border-b border-border',
                col.leftBorder && isAlwaysSticky && LEFT_BORDER_SHADOW,
                col.leftBorder && isMdSticky && 'md:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.15)] md:border-l-2 md:border-border/50',
                col.freezeEnd && isAlwaysSticky && FREEZE_SHADOW,
                col.freezeEnd && isMdSticky && 'md:shadow-[6px_0_12px_-4px_rgba(0,0,0,0.15)] md:border-r-2 md:border-border/50',
                // Backgrounds
                isAlwaysSticky && 'bg-background',
                isMdSticky && 'bg-transparent md:bg-background',
                isRightSticky && 'bg-background',
                // Drag and Drop Indicator
                isDropTarget && dropPosition === 'left' && 'border-l-2 border-l-primary',
                isDropTarget && dropPosition === 'right' && 'border-r-2 border-r-primary'
            )}
            style={style}
            title={col.tooltip}
            {...props}
        />
    );
}

interface SmartTableCellProps extends React.ComponentProps<typeof TableCell> {
    col: SmartTableColDef;
}

export function SmartTableCell({ col, className, style, children, title, ...props }: SmartTableCellProps) {
    const isAlwaysSticky = col.sticky === true && !col.responsiveSticky;
    const isMdSticky = col.responsiveSticky === true;
    const isRightSticky = !!col.stickyRight;

    // Base bg for sticky cells
    const baseBg = 'bg-background group-hover:bg-muted group-data-[state=selected]:bg-muted';
    const mdBg = 'md:bg-background group-hover:md:bg-muted group-data-[state=selected]:md:bg-muted';

    return (
        <TableCell
            className={cn(
                className,
                col.align === 'center' && 'text-center',
                col.align === 'right' && 'text-right',
                // Width limits
                col.width,
                col.minWidth,
                col.maxWidth,
                // Sticky logic
                isAlwaysSticky && 'sticky z-10',
                isMdSticky && 'md:sticky md:z-10',
                isRightSticky && 'sticky z-10',
                // Offsets
                (isAlwaysSticky || isMdSticky) && col.stickyLeft,
                isRightSticky && col.stickyRightOffset,
                // Borders
                'border-b border-border',
                col.leftBorder && isAlwaysSticky && LEFT_BORDER_SHADOW,
                col.leftBorder && isMdSticky && 'md:shadow-[-6px_0_12px_-4px_rgba(0,0,0,0.15)] md:border-l-2 md:border-border/50',
                col.freezeEnd && isAlwaysSticky && FREEZE_SHADOW,
                col.freezeEnd && isMdSticky && 'md:shadow-[6px_0_12px_-4px_rgba(0,0,0,0.15)] md:border-r-2 md:border-border/50',
                // Backgrounds
                isAlwaysSticky && baseBg,
                isMdSticky && mdBg,
                isRightSticky && baseBg
            )}
            style={style}
            {...props}
        >
            {children}
        </TableCell>
    );
}
