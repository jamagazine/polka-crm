import { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RotateCcw, Search, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { cn } from '../../components/ui/utils';
import { usePanelStore } from '../../core/store';
import type { CalendarViewMode } from '../../core/store/rightSlice';
import { getMastersInflowData, getFormattedRangeText } from './statsHelper';
import { StatsInflowChart } from './StatsInflowChart';

type FooterMode = 'idle' | 'search' | 'range-picker' | 'expanded';
const MONTH_NAMES = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];

const MONTH_NAMES_SHORT = [
    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
];

const QUARTER_NAMES = ['I', 'II', 'III', 'IV'];

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

/* ─── Helpers ─── */

function formatDateShort(d: Date | null): string {
    if (!d) return '';
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
}

const SEARCH_MONTHS: Record<string, number> = {
    'янв': 0, 'январь': 0, 'января': 0,
    'фев': 1, 'февраль': 1, 'февраля': 1,
    'мар': 2, 'март': 2, 'марта': 2,
    'апр': 3, 'апрель': 3, 'апреля': 3,
    'май': 4, 'мая': 4,
    'июн': 5, 'июнь': 5, 'июня': 5,
    'июл': 6, 'июль': 6, 'июля': 6,
    'авг': 7, 'август': 7, 'августа': 7,
    'сен': 8, 'сентябрь': 8, 'сентября': 8,
    'окт': 9, 'октябрь': 9, 'октября': 9,
    'ноя': 10, 'ноябрь': 10, 'ноября': 10,
    'дек': 11, 'декабрь': 11, 'декабря': 11,
};

function parseSearchQuery(query: string): { start: Date; end: Date; viewMonth: number; viewYear: number; viewMode: CalendarViewMode } | null {
    query = query.trim().toLowerCase();
    const currYear = new Date().getFullYear();

    // 1. ДАТА - ДАТА (DD.MM.YY - DD.MM.YY  или DD.MM.YYYY - DD.MM.YYYY)
    const rangeMatch = query.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})\s*-\s*(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
    if (rangeMatch) {
        let y1 = parseInt(rangeMatch[3]); if (y1 < 100) y1 += 2000;
        let y2 = parseInt(rangeMatch[6]); if (y2 < 100) y2 += 2000;
        const d1 = new Date(y1, parseInt(rangeMatch[2]) - 1, parseInt(rangeMatch[1]));
        const d2 = new Date(y2, parseInt(rangeMatch[5]) - 1, parseInt(rangeMatch[4]));
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            return { start: d1, end: d2, viewMonth: d1.getMonth(), viewYear: d1.getFullYear(), viewMode: 'month' };
        }
    }

    // 1.5 Кварталы
    const quarterMatch = query.match(/^(1|2|3|4|i|ii|iii|iv)\s*(?:кв|кв\.|q|квартал)?\s*(?:\s+(\d{2,4}))?$/);
    if (quarterMatch) {
        let qStr = quarterMatch[1];
        let qIndex = 0;
        if (qStr === '1' || qStr === 'i' || qStr === 'q1') qIndex = 0;
        else if (qStr === '2' || qStr === 'ii' || qStr === 'q2') qIndex = 1;
        else if (qStr === '3' || qStr === 'iii' || qStr === 'q3') qIndex = 2;
        else if (qStr === '4' || qStr === 'iv' || qStr === 'q4') qIndex = 3;

        let y = currYear;
        if (quarterMatch[2]) {
            y = parseInt(quarterMatch[2]);
            if (y < 100) y += 2000;
        }

        const startMonth = qIndex * 3;
        const start = new Date(y, startMonth, 1);
        const end = new Date(y, startMonth + 3, 0);
        return { start, end, viewMonth: startMonth, viewYear: y, viewMode: 'quarter' };
    }

    // 3. ММ.ГГ
    const mmYyyyMatch = query.match(/^(\d{1,2})\.(\d{4})$/);
    if (mmYyyyMatch) {
        const m = parseInt(mmYyyyMatch[1]) - 1;
        const y = parseInt(mmYyyyMatch[2]);
        if (m >= 0 && m <= 11) {
            const start = new Date(y, m, 1);
            const end = new Date(y, m + 1, 0);
            return { start, end, viewMonth: m, viewYear: y, viewMode: 'month' };
        }
    }
    const mmYyMatch = query.match(/^(\d{1,2})\.(\d{2})$/);
    if (mmYyMatch && parseInt(mmYyMatch[1]) <= 12 && parseInt(mmYyMatch[2]) > 20) {
        const m = parseInt(mmYyMatch[1]) - 1;
        const y = parseInt(mmYyMatch[2]) + 2000;
        const start = new Date(y, m, 1);
        const end = new Date(y, m + 1, 0);
        return { start, end, viewMonth: m, viewYear: y, viewMode: 'month' };
    }

    // 2. ДД.ММ.ГГ
    const dateMatch = query.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/);
    if (dateMatch) {
        let y = dateMatch[3] ? parseInt(dateMatch[3]) : currYear;
        if (y < 100) y += 2000;
        const d = new Date(y, parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
        if (!isNaN(d.getTime())) {
            return { start: d, end: d, viewMonth: d.getMonth(), viewYear: d.getFullYear(), viewMode: 'month' };
        }
    }

    // 4. Название месяца
    const monthMatch = query.match(/^([а-яёa-z]+)(?:\s+(\d{2,4}))?$/);
    if (monthMatch) {
        const monthName = monthMatch[1];
        let y = currYear;
        if (monthMatch[2]) {
            y = parseInt(monthMatch[2]);
            if (y < 100) y += 2000;
        }
        if (monthName in SEARCH_MONTHS) {
            const m = SEARCH_MONTHS[monthName];
            const start = new Date(y, m, 1);
            const end = new Date(y, m + 1, 0);
            return { start, end, viewMonth: m, viewYear: y, viewMode: 'month' };
        }
    }

    return null; // parse failed
}

/** Normalize a Date to midnight */
function startOfDay(d: Date): Date {
    const r = new Date(d);
    r.setHours(0, 0, 0, 0);
    return r;
}

function getQuarter(month: number): number {
    return Math.floor(month / 3); // 0-based quarter
}

function getQuarterRange(year: number, quarter: number): [Date, Date] {
    const startMonth = quarter * 3;
    return [
        new Date(year, startMonth, 1),
        new Date(year, startMonth + 3, 0) // last day of quarter
    ];
}

function getMonthRange(year: number, month: number): [Date, Date] {
    return [
        new Date(year, month, 1),
        new Date(year, month + 1, 0)
    ];
}

function getYearRange(year: number): [Date, Date] {
    return [
        new Date(year, 0, 1),
        new Date(year, 11, 31)
    ];
}

function isSameDay(a: Date | null, b: Date | null): boolean {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isInRange(day: Date, start: Date | null, end: Date | null): boolean {
    if (!start || !end) return false;
    const t = day.getTime();
    return t >= start.getTime() && t <= end.getTime();
}

/* ─── Component ─── */

export function InteractiveCalendar() {
    const {
        dateRange, setDateRange,
        calendarViewMode, setCalendarViewMode,
        footerMode, setFooterMode,
        viewMonth, setViewMonth,
        viewYear, setViewYear,
        resetCalendar,
        masters,
        baseFilteredIds
    } = usePanelStore(useShallow(state => ({
        dateRange: state.dateRange,
        setDateRange: state.setDateRange,
        calendarViewMode: state.calendarViewMode,
        setCalendarViewMode: state.setCalendarViewMode,
        footerMode: state.footerMode,
        setFooterMode: state.setFooterMode,
        viewMonth: state.viewMonth,
        setViewMonth: state.setViewMonth,
        viewYear: state.viewYear,
        setViewYear: state.setViewYear,
        resetCalendar: state.resetCalendar,
        masters: state.masters,
        baseFilteredIds: state.baseFilteredIds
    })));

    const filteredMasters = useMemo(() => {
        if (!baseFilteredIds || baseFilteredIds.length === 0) return [];
        const idSet = new Set(baseFilteredIds);
        return masters.filter(m => idSet.has(m._id));
    }, [masters, baseFilteredIds]);

    const today = startOfDay(new Date());
    const [selectionAnchor, setSelectionAnchor] = useState<Date | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    /* ─── Navigation ─── */

    const navigatePeriod = useCallback((direction: 1 | -1) => {
        const step = calendarViewMode === 'year' ? 12 : calendarViewMode === 'quarter' ? 3 : 1;
        let newMonth = viewMonth + direction * step;
        let newYear = viewYear;
        while (newMonth < 0) { newMonth += 12; newYear--; }
        while (newMonth > 11) { newMonth -= 12; newYear++; }
        setViewMonth(newMonth);
        setViewYear(newYear);

        // Update dateRange to match the new view
        if (calendarViewMode === 'month') {
            const [s, e] = getMonthRange(newYear, newMonth);
            setDateRange(s, e);
        } else if (calendarViewMode === 'quarter') {
            const q = getQuarter(newMonth);
            const [s, e] = getQuarterRange(newYear, q);
            setDateRange(s, e);
        } else {
            const [s, e] = getYearRange(newYear);
            setDateRange(s, e);
        }
    }, [calendarViewMode, viewMonth, viewYear, setDateRange]);

    const navigateView = useCallback((direction: 1 | -1) => {
        let newMonth = viewMonth + direction;
        let newYear = viewYear;
        while (newMonth < 0) { newMonth += 12; newYear--; }
        while (newMonth > 11) { newMonth -= 12; newYear++; }
        setViewMonth(newMonth);
        setViewYear(newYear);
    }, [viewMonth, viewYear, setViewMonth, setViewYear]);

    /* ─── Preset buttons ─── */

    const handleViewModeChange = useCallback((mode: CalendarViewMode) => {
        setCalendarViewMode(mode);
        setSelectionAnchor(null);
        setFooterMode('idle');
        if (mode === 'month') {
            const [s, e] = getMonthRange(viewYear, viewMonth);
            setDateRange(s, e);
        } else if (mode === 'quarter') {
            const q = getQuarter(viewMonth);
            const [s, e] = getQuarterRange(viewYear, q);
            setDateRange(s, e);
        } else {
            const [s, e] = getYearRange(viewYear);
            setDateRange(s, e);
        }
    }, [viewYear, viewMonth, setCalendarViewMode, setDateRange, setFooterMode]);

    /* ─── Click handlers ─── */

    const handleDayClick = useCallback((cellDate: Date) => {
        setCalendarViewMode('month');

        // If there's an active anchor and it's the second click
        if (selectionAnchor && dateRange.start && dateRange.end && isSameDay(dateRange.start, dateRange.end)) {
            const tAnchor = selectionAnchor.getTime();
            const tCell = cellDate.getTime();

            if (tCell === tAnchor) {
                // Clicked the same day again -> do nothing or let it remain single
                return;
            } else if (tCell > tAnchor) {
                setDateRange(selectionAnchor, cellDate);
            } else {
                setDateRange(cellDate, selectionAnchor);
            }
            setSelectionAnchor(null); // Range complete
        } else {
            // New cycle: set anchor and select single day
            setSelectionAnchor(cellDate);
            setDateRange(cellDate, cellDate);
        }
    }, [setCalendarViewMode, setDateRange, selectionAnchor, dateRange.start, dateRange.end]);

    const handleDayDoubleClick = useCallback((cellDate: Date) => {
        setCalendarViewMode('month');
        setSelectionAnchor(null); // Clear any partial anchor
        const now = startOfDay(new Date());
        const tNow = now.getTime();
        const tCell = cellDate.getTime();

        if (tCell <= tNow) {
            setDateRange(cellDate, now);
        } else {
            setDateRange(now, cellDate);
        }
    }, [setCalendarViewMode, setDateRange]);

    /* ─── Header text ─── */

    const headerText = useMemo(() => {
        if (calendarViewMode === 'quarter') {
            const q = getQuarter(viewMonth);
            const startM = q * 3;
            return `${QUARTER_NAMES[q]} Кв. ${viewYear} (${MONTH_NAMES_SHORT[startM]}-${MONTH_NAMES_SHORT[startM + 2]})`;
        }
        if (calendarViewMode === 'year') {
            return `${viewYear} год`;
        }
        return `${MONTH_NAMES[viewMonth]} ${viewYear}`;
    }, [calendarViewMode, viewMonth, viewYear]);

    /* ─── Grid cells ─── */

    const cells = useMemo(() => {
        const firstDay = new Date(viewYear, viewMonth, 1);
        let startDow = firstDay.getDay() - 1;
        if (startDow < 0) startDow = 6;

        const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
        const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

        const result: { day: number; currentMonth: boolean; date: Date }[] = [];

        for (let i = startDow - 1; i >= 0; i--) {
            const d = prevMonthDays - i;
            result.push({ day: d, currentMonth: false, date: startOfDay(new Date(viewYear, viewMonth - 1, d)) });
        }

        for (let d = 1; d <= daysInMonth; d++) {
            result.push({ day: d, currentMonth: true, date: startOfDay(new Date(viewYear, viewMonth, d)) });
        }

        const remaining = 42 - result.length;
        for (let d = 1; d <= remaining; d++) {
            result.push({ day: d, currentMonth: false, date: startOfDay(new Date(viewYear, viewMonth + 1, d)) });
        }

        return result;
    }, [viewYear, viewMonth]);

    // Always show exactly 6 rows (42 cells) so the calendar height never jumps
    const visibleRows = 6;
    const visibleCells = cells.slice(0, visibleRows * 7);

    const rangeStart = dateRange.start ? startOfDay(dateRange.start) : null;
    const rangeEnd = dateRange.end ? startOfDay(dateRange.end) : null;
    const isSingleDay = rangeStart && rangeEnd && isSameDay(rangeStart, rangeEnd);
    const hasRange = rangeStart !== null && rangeEnd !== null;

    const rangeText = useMemo(() => {
        return getFormattedRangeText(calendarViewMode, viewMonth, viewYear, dateRange);
    }, [calendarViewMode, viewMonth, viewYear, dateRange]);

    const handleReset = useCallback(() => {
        resetCalendar();
        setSelectionAnchor(null);
    }, [resetCalendar]);

    const handleSearchSubmit = () => {
        const parsed = parseSearchQuery(searchQuery);
        if (parsed) {
            setDateRange(parsed.start, parsed.end);
            setViewMonth(parsed.viewMonth);
            setViewYear(parsed.viewYear);
            setCalendarViewMode(parsed.viewMode);
            setFooterMode('idle');
        }
    };



    return (
        <div className="flex flex-col select-none h-full bg-white relative">
            {/* 2. Центральная область (Grid & Chart) */}
            <div className="flex flex-col shrink-0 overflow-visible w-full">
                {/* Внутренний контейнер для Календаря и Футера без flex-grow (чтобы не расталкивать) */}
                <div className="flex flex-col shrink-0">
                    <div className="px-2 pt-2" onContextMenu={(e) => { e.preventDefault(); handleReset(); }}>
                        {/* Weekday labels */}
                        <div className="grid grid-cols-7 border-border/50">
                            {WEEK_DAYS.map((wd) => (
                                <div
                                    key={wd}
                                    className="flex items-center justify-center h-[40px] text-[10px] font-medium text-muted-foreground uppercase"
                                >
                                    {wd}
                                </div>
                            ))}
                        </div>

                        {/* Day grid */}
                        <div className="grid grid-cols-7 pb-2">
                            {visibleCells.map((cell, idx) => {
                                const isToday = isSameDay(cell.date, today);
                                const isStart = rangeStart && isSameDay(cell.date, rangeStart);
                                const isEnd = rangeEnd && isSameDay(cell.date, rangeEnd);
                                const inRange = !isSingleDay && isInRange(cell.date, rangeStart, rangeEnd);
                                const isEdge = isStart || isEnd;

                                let roundingClasses = 'rounded-[4px]';
                                if (hasRange && inRange && !isSingleDay) {
                                    const col = idx % 7;
                                    const dAbove = new Date(cell.date);
                                    dAbove.setDate(dAbove.getDate() - 7);
                                    const hasRangeAbove = isInRange(dAbove, rangeStart, rangeEnd);

                                    const dBelow = new Date(cell.date);
                                    dBelow.setDate(dBelow.getDate() + 7);
                                    const hasRangeBelow = isInRange(dBelow, rangeStart, rangeEnd);

                                    const roundedTl = (isStart && col !== 0) || (col === 0 && !hasRangeAbove);
                                    const roundedBl = (isStart && col !== 0) || (col === 0 && !hasRangeBelow);
                                    const roundedTr = (isEnd && col !== 6) || (col === 6 && !hasRangeAbove);
                                    const roundedBr = (isEnd && col !== 6) || (col === 6 && !hasRangeBelow);

                                    roundingClasses = cn(
                                        roundedTl && 'rounded-tl-[4px]',
                                        roundedBl && 'rounded-bl-[4px]',
                                        roundedTr && 'rounded-tr-[4px]',
                                        roundedBr && 'rounded-br-[4px]'
                                    );
                                }

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => cell.currentMonth && handleDayClick(cell.date)}
                                        onDoubleClick={() => cell.currentMonth && handleDayDoubleClick(cell.date)}
                                        className={cn(
                                            'flex items-center justify-center h-[40px] text-[11px] transition-colors border-b border-border/10',
                                            roundingClasses,
                                            cell.currentMonth ? 'cursor-pointer' : 'cursor-default',
                                            // Base text color
                                            cell.currentMonth
                                                ? 'text-foreground'
                                                : 'text-muted-foreground/40',
                                            // Range body (not edges)
                                            cell.currentMonth && hasRange && inRange && !isEdge && 'bg-primary/15',
                                            // Range edges (start/end)
                                            cell.currentMonth && hasRange && isEdge && 'bg-primary text-white font-bold',
                                            // Single day selection
                                            cell.currentMonth && hasRange && isSingleDay && isStart && 'bg-primary text-white font-bold',
                                            // Today ring (always visible as border when not selected as edge)
                                            cell.currentMonth && isToday && !(hasRange && isEdge) && !(hasRange && isSingleDay && isStart) && 'ring-2 ring-primary ring-inset',
                                            // Hover only for non-selected current-month cells
                                            cell.currentMonth && !(hasRange && isEdge) && !(hasRange && isSingleDay && isStart) && 'hover:bg-muted/40',
                                        )}
                                    >
                                        {cell.day}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 4. Footer: State Machine */}
                <div className="bg-muted/5 shrink-0 overflow-hidden relative py-3" style={{ minHeight: '48px' }}>

                    {/* Состояние 'idle' / 'expanded' - теперь они объединены */}
                    {footerMode === 'idle' && (
                        <div className="flex items-center justify-between h-[48px] px-1 absolute inset-0 w-full bg-muted/5">

                            <div className="flex items-center h-full">
                                {(calendarViewMode !== 'month' || hasRange) && (
                                    <button
                                        onClick={() => navigatePeriod(-1)}
                                        className="p-1 rounded hover:bg-black/5 transition-colors text-muted-foreground mr-0.5"
                                        title="Предыдущий период (Квартал/Год)"
                                    >
                                        <ChevronsLeft className="w-4 h-4" />
                                    </button>
                                )}
                                <button
                                    onClick={() => navigateView(-1)}
                                    className="p-1 rounded hover:bg-black/5 transition-colors text-muted-foreground"
                                    title="Предыдущий месяц"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex flex-1 items-center bg-white border border-border shadow-sm rounded-md mx-1 overflow-hidden h-[32px]">
                                <button
                                    onClick={() => setFooterMode('search')}
                                    className="flex flex-1 items-center justify-center gap-1.5 px-2 hover:bg-muted/30 transition-colors text-[11px] font-medium text-muted-foreground h-full overflow-hidden"
                                >
                                    <Search className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">Поиск...</span>
                                </button>

                                <div className="w-[1px] h-4 bg-border shrink-0" />

                                <button
                                    onClick={() => setFooterMode('range-picker')}
                                    className="px-2 hover:bg-muted/30 transition-colors text-[11px] font-bold text-foreground h-full shrink-0 min-w-[44px]"
                                >
                                    {calendarViewMode === 'month' ? 'МЕС' : calendarViewMode === 'quarter' ? 'КВ' : 'ГОД'}
                                </button>

                                {hasRange && (
                                    <>
                                        <div className="w-[1px] h-4 bg-border shrink-0" />
                                        <button
                                            onClick={handleReset}
                                            className="px-2 hover:bg-black/5 transition-colors text-muted-foreground shrink-0 h-full"
                                            title="Сбросить фильтр дат"
                                        >
                                            <RotateCcw className="w-3 h-3" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="flex items-center h-full">
                                <button
                                    onClick={() => navigateView(1)}
                                    className="p-1 rounded hover:bg-black/5 transition-colors text-muted-foreground mr-0.5"
                                    title="Следующий месяц"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                {(calendarViewMode !== 'month' || hasRange) && (
                                    <button
                                        onClick={() => navigatePeriod(1)}
                                        className="p-1 rounded hover:bg-black/5 transition-colors text-muted-foreground"
                                        title="Следующий период (Квартал/Год)"
                                    >
                                        <ChevronsRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Состояние 'search' */}
                    {footerMode === 'search' && (
                        <div className="flex items-center h-[48px] px-2 absolute inset-0 w-full bg-muted/5">
                            <button
                                onClick={() => navigateView(-1)}
                                className="p-1.5 rounded hover:bg-black/5 transition-colors text-muted-foreground"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="flex-1 relative flex items-center h-full px-2">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="ДД.ММ.ГГ или 2 кв."
                                    className="w-full text-xs h-[28px] px-2 pr-7 outline-none border border-border rounded shadow-inner"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') handleSearchSubmit();
                                        else if (e.key === 'Escape') setFooterMode('idle');
                                    }}
                                />
                                {searchQuery && (
                                    <button
                                        onClick={handleSearchSubmit}
                                        className="absolute right-3.5 p-1 text-primary hover:text-primary/70"
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setFooterMode('idle')}
                                className="p-1.5 mr-1 rounded hover:bg-black/5 transition-colors text-muted-foreground"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigateView(1)}
                                className="p-1.5 rounded hover:bg-black/5 transition-colors text-muted-foreground"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    {/* Состояние 'range-picker' */}
                    {footerMode === 'range-picker' && (
                        <div className="flex items-center h-[48px] px-3 absolute inset-0 w-full bg-muted/5 gap-2">
                            <button
                                onClick={() => setFooterMode('idle')}
                                className="p-1.5 rounded hover:bg-black/5 transition-colors text-muted-foreground shrink-0"
                                title="Отмена"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            <div className="flex flex-1 rounded-md border border-border overflow-hidden bg-white shadow-sm">
                                <button
                                    onClick={() => handleViewModeChange('month')}
                                    className={cn("flex-1 py-1 text-[11px] font-bold uppercase transition-colors border-r border-border", calendarViewMode === 'month' ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/30")}
                                >
                                    МЕСЯЦ
                                </button>
                                <button
                                    onClick={() => handleViewModeChange('quarter')}
                                    className={cn("flex-1 py-1 text-[11px] font-bold uppercase transition-colors border-r border-border", calendarViewMode === 'quarter' ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/30")}
                                >
                                    КВАРТАЛ
                                </button>
                                <button
                                    onClick={() => handleViewModeChange('year')}
                                    className={cn("flex-1 py-1 text-[11px] font-bold uppercase transition-colors", calendarViewMode === 'year' ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/30")}
                                >
                                    ГОД
                                </button>
                            </div>
                        </div>
                    )}

                </div>

            </div> {/* конец shrink-0 обертки для календаря+футера */}

            {/* 4. Статистика - Занимает всю нижнюю часть через flex-1 */}
            <div className="flex flex-col flex-1 min-h-[150px] bg-white">
                <StatsInflowChart
                    masters={filteredMasters}
                    viewYear={viewYear}
                    viewMonth={viewMonth}
                    mode={calendarViewMode}
                    dateRange={dateRange}
                    rangeText={rangeText}
                    onDrillDown={(mode, start, end) => {
                        setCalendarViewMode(mode);
                        setDateRange(start, end);
                        setViewMonth(start.getMonth());
                        setViewYear(start.getFullYear());
                    }}
                    onDrillUp={() => {
                        // Strict Cascade: Day -> Week -> Month -> Quarter -> Year
                        if (calendarViewMode === 'month') {
                            if (dateRange.start && dateRange.end) {
                                if (dateRange.start.getTime() === dateRange.end.getTime()) {
                                    // Current: Day -> Target: Week
                                    // Go back to the week covering this day
                                    const d = dateRange.start;
                                    const dayOfWeek = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
                                    const weekStart = new Date(d);
                                    weekStart.setDate(d.getDate() - dayOfWeek);
                                    const weekEnd = new Date(weekStart);
                                    weekEnd.setDate(weekStart.getDate() + 6);
                                    setDateRange(weekStart, weekEnd);
                                } else {
                                    const diffDays = Math.round((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
                                    if (diffDays === 6) {
                                        // Current: Week -> Target: Month (entire viewMonth)
                                        setDateRange(new Date(viewYear, viewMonth, 1), new Date(viewYear, viewMonth + 1, 0));
                                    } else {
                                        // Current: Month -> Target: Quarter
                                        setCalendarViewMode('quarter');
                                        const q = Math.floor(viewMonth / 3);
                                        const qStartMonth = q * 3;
                                        setDateRange(new Date(viewYear, qStartMonth, 1), new Date(viewYear, qStartMonth + 3, 0));
                                    }
                                }
                            } else {
                                // Fallback: Month -> Quarter
                                setCalendarViewMode('quarter');
                                const q = Math.floor(viewMonth / 3);
                                const qStartMonth = q * 3;
                                setDateRange(new Date(viewYear, qStartMonth, 1), new Date(viewYear, qStartMonth + 3, 0));
                            }
                        } else if (calendarViewMode === 'quarter') {
                            // Current: Quarter -> Target: Year
                            setCalendarViewMode('year');
                            setDateRange(new Date(viewYear, 0, 1), new Date(viewYear, 11, 31));
                        } else {
                            // Target: Year
                            setCalendarViewMode('year');
                            setDateRange(new Date(viewYear, 0, 1), new Date(viewYear, 11, 31));
                        }
                    }}
                />
            </div>
        </div>
    );
}
