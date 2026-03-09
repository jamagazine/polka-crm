import { Master } from '../../api/client';
import { CalendarViewMode, DateRange } from '../../core/store/rightSlice';

export interface DrillDownTarget {
    mode: CalendarViewMode;
    rangeStart: Date;
    rangeEnd: Date;
}

export interface ChartDataPoint {
    label: string;
    value: number;
    fullDateLabel?: string; // For tooltips
    target?: DrillDownTarget; // The range to drill down into on click
    isActive?: boolean;
}

// Function to safely extract timestamp in ms from CloudShop's created string/number
function parseDateString(created: any): Date | null {
    if (!created) return null;
    let ts = Number(created);
    if (isNaN(ts) && typeof created === 'string') {
        ts = new Date(created).getTime();
    } else if (ts > 0 && ts < 10000000000) {
        ts = ts * 1000;
    }
    if (!ts || isNaN(ts)) return null;
    return new Date(ts);
}

// Check if range spans exactly one week
function isWeekRange(start: Date | null, end: Date | null): boolean {
    if (!start || !end) return false;
    const diff = end.getTime() - start.getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    return Math.round(days) === 6; // 7 days inclusive = 6 days difference
}

// Generate real calendar weeks (Monday-Sunday) for a given month
function getMonthCalendarWeeks(year: number, month: number): { start: Date, end: Date }[] {
    const weeks: { start: Date, end: Date }[] = [];
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let currentStart = 1;
    while (currentStart <= daysInMonth) {
        const startDate = new Date(year, month, currentStart);
        // Monday = 0 ... Sunday = 6
        const dayOfWeek = (startDate.getDay() + 6) % 7;
        const daysUntilSunday = 6 - dayOfWeek;

        const currentEnd = Math.min(currentStart + daysUntilSunday, daysInMonth);
        const endDate = new Date(year, month, currentEnd);

        weeks.push({ start: startDate, end: endDate });
        currentStart = currentEnd + 1;
    }

    return weeks;
}

export function getMastersInflowData(
    masters: Master[],
    viewYear: number,
    viewMonth: number,
    mode: CalendarViewMode,
    dateRange: DateRange
): ChartDataPoint[] {

    // --- MODE: YEAR ---
    // User sees 12 months. Clicking a month drills down to that month.
    if (mode === 'year') {
        const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const FULL_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const counts = new Array(12).fill(0);

        masters.forEach(m => {
            const d = parseDateString(m.created);
            if (!d) return;
            if (d.getFullYear() === viewYear) {
                counts[d.getMonth()]++;
            }
        });

        return MONTHS.map((label, i) => {
            const start = new Date(viewYear, i, 1);
            const end = new Date(viewYear, i + 1, 0); // Last day of that month
            return {
                label,
                value: counts[i],
                fullDateLabel: `${FULL_MONTHS[i]} ${viewYear}`,
                target: {
                    mode: 'month',
                    rangeStart: start,
                    rangeEnd: end
                }
            };
        });
    }

    // --- MODE: QUARTER ---
    // User sees 3 months. Clicking a month drills down to that month.
    if (mode === 'quarter') {
        const quarter = Math.floor(viewMonth / 3);
        const startMonth = quarter * 3;
        const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const FULL_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        const qMonths = [startMonth, startMonth + 1, startMonth + 2];
        const counts = [0, 0, 0];

        masters.forEach(m => {
            const d = parseDateString(m.created);
            if (!d) return;
            if (d.getFullYear() === viewYear && qMonths.includes(d.getMonth())) {
                counts[d.getMonth() - startMonth]++;
            }
        });

        return qMonths.map((mIdx, i) => {
            const start = new Date(viewYear, mIdx, 1);
            const end = new Date(viewYear, mIdx + 1, 0);
            return {
                label: FULL_MONTHS[mIdx],
                value: counts[i],
                fullDateLabel: `${FULL_MONTHS[mIdx]} ${viewYear}`,
                target: {
                    mode: 'month',
                    rangeStart: start,
                    rangeEnd: end
                }
            };
        });
    }

    // --- MODE: WEEK ---
    // Shown when mode === 'month' AND the date range is exactly 1 week, OR a single day inside the month.
    let weekBoundaries: { start: Date, end: Date } | null = null;

    // local helper function to check if same day
    const isSameDayLoc = (a: Date | null, b: Date | null) => {
        if (!a || !b) return false;
        return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    };

    if (mode === 'month' && dateRange.start && dateRange.end) {
        const weeks = getMonthCalendarWeeks(viewYear, viewMonth);
        const sTime = dateRange.start.getTime();
        const eTime = dateRange.end.getTime();

        const matchingWeek = weeks.find(w =>
            sTime >= w.start.getTime() && eTime <= w.end.getTime() + 86399999
        );

        if (matchingWeek) {
            weekBoundaries = matchingWeek;
        } else if (isWeekRange(dateRange.start, dateRange.end)) {
            // Strict 7-day fallback 
            weekBoundaries = { start: dateRange.start, end: dateRange.end };
        }
    }

    if (weekBoundaries) {
        const bStart = weekBoundaries.start;
        const bEnd = weekBoundaries.end;
        const diffDays = Math.round((bEnd.getTime() - bStart.getTime()) / 86400000);
        const numDays = diffDays + 1;

        const counts = new Array(numDays).fill(0);
        const startTimestamp = bStart.getTime();

        masters.forEach(m => {
            const d = parseDateString(m.created);
            if (!d) return;
            const t = d.getTime();
            if (t >= startTimestamp && t <= bEnd.getTime() + 86399999) {
                const dayOffset = Math.floor((t - startTimestamp) / 86400000);
                if (dayOffset >= 0 && dayOffset < numDays) {
                    counts[dayOffset]++;
                }
            }
        });

        const isFullWeekSelected = isSameDayLoc(dateRange.start, bStart) && isSameDayLoc(dateRange.end, bEnd);

        return counts.map((count, i) => {
            const targetDate = new Date(startTimestamp + i * 86400000);
            const dayStr = targetDate.getDate();
            const t = targetDate.getTime();

            const isThisDayActive = !isFullWeekSelected &&
                dateRange.start && dateRange.end &&
                t >= dateRange.start.getTime() &&
                t <= dateRange.end.getTime() + 86399999;

            return {
                label: String(dayStr),
                value: count,
                fullDateLabel: targetDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }),
                target: {
                    mode: 'month',
                    rangeStart: targetDate,
                    rangeEnd: targetDate // Lock to a single day
                },
                isActive: Boolean(isThisDayActive)
            }
        });
    }

    // --- MODE: MONTH (Default weekly breakdown) ---
    // Break month into calendar weeks (Mon-Sun)
    // Clicking a week drills down to that specific WEEK.
    if (mode === 'month') {
        const weeks = getMonthCalendarWeeks(viewYear, viewMonth);
        const counts = new Array(weeks.length).fill(0);

        masters.forEach(m => {
            const d = parseDateString(m.created);
            if (!d) return;

            if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
                const t = d.getTime();
                const weekIdx = weeks.findIndex(w => t >= w.start.getTime() && t <= w.end.getTime() + 86399999);
                if (weekIdx !== -1) {
                    counts[weekIdx]++;
                }
            }
        });

        return weeks.map((w, i) => {
            const sDay = w.start.getDate();
            const eDay = w.end.getDate();

            return {
                label: sDay === eDay ? String(sDay) : `${sDay}-${eDay}`,
                value: counts[i],
                fullDateLabel: sDay === eDay ? `${sDay} числа` : `${sDay} - ${eDay} числа`,
                target: {
                    mode: 'month',
                    rangeStart: w.start,
                    rangeEnd: w.end
                }
            };
        });
    }

    return [];
}

// Generate the shortened Range Text (e.g., 'I кв. 2026г.', 'Март 2026г.', '10 - 17 марта 2026г.')
export function getFormattedRangeText(
    mode: CalendarViewMode,
    viewMonth: number,
    viewYear: number,
    dateRange: DateRange
): string {
    const MONTH_NAMES = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const MONTH_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    const QUARTER_NAMES = ['I', 'II', 'III', 'IV'];

    if (mode === 'year') {
        return `${viewYear} год`;
    }

    if (mode === 'quarter') {
        return `${QUARTER_NAMES[Math.floor(viewMonth / 3)]} кв. ${viewYear}г.`;
    }

    // mode === 'month'
    if (dateRange.start && dateRange.end) {
        // Range text
        const s = dateRange.start;
        const e = dateRange.end;

        const sDay = s.getDate();
        const eDay = e.getDate();
        const sMonth = s.getMonth();
        const eMonth = e.getMonth();
        const sYear = s.getFullYear();
        const eYear = e.getFullYear();

        if (s.getTime() === e.getTime()) {
            // Single day
            return `${sDay} ${MONTH_GENITIVE[sMonth]} ${sYear}г.`;
        }

        // Entire exact month check
        if (sDay === 1 && sMonth === eMonth && sYear === eYear && eDay === new Date(eYear, eMonth + 1, 0).getDate()) {
            return `${MONTH_NAMES[sMonth]} ${sYear}г.`;
        }

        // Same month cross-week
        if (sMonth === eMonth && sYear === eYear) {
            return `${sDay} - ${eDay} ${MONTH_GENITIVE[sMonth]} ${sYear}г.`;
        }

        // Cross month/year
        const left = `${sDay} ${MONTH_GENITIVE[sMonth]}`;
        const right = `${eDay} ${MONTH_GENITIVE[eMonth]} ${eYear}г.`;
        return `${left} - ${right}`;
    }

    // Default Fallback
    return `${MONTH_NAMES[viewMonth]} ${viewYear}г.`;
}
