/* ─── Типы ─── */
import React from 'react';

export interface FooterCard {
    id: string;
    label: string;
    shortLabel: string;
    count: number;
    customCount?: string | React.ReactNode;
    tooltip?: string;
}

export type CalendarViewMode = 'month' | 'quarter' | 'year';

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface RightSlice {
    rightFooterCards: FooterCard[];
    activeRightCardId: string;
    dateRange: DateRange;
    calendarViewMode: CalendarViewMode;

    setRightFooterCards: (cards: FooterCard[]) => void;
    setActiveRightCard: (id: string) => void;
    setDateRange: (start: Date | null, end: Date | null) => void;
    setCalendarViewMode: (mode: CalendarViewMode) => void;
}

/* ─── Фабрика слайса ─── */

const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const createRightSlice = (
    set: (fn: (s: RightSlice) => Partial<RightSlice>) => void,
): RightSlice => ({
    rightFooterCards: [],
    activeRightCardId: 'calendar',
    dateRange: { start: null, end: null },
    calendarViewMode: 'month',

    setRightFooterCards: (cards) =>
        set((s) => {
            const isValid = cards.some(c => c.id === s.activeRightCardId);
            return {
                rightFooterCards: cards,
                activeRightCardId: isValid ? s.activeRightCardId : (cards[0]?.id ?? '')
            };
        }),

    setActiveRightCard: (id) => set(() => ({ activeRightCardId: id })),

    setDateRange: (start, end) => set(() => ({ dateRange: { start, end } })),

    setCalendarViewMode: (mode) => set(() => ({ calendarViewMode: mode })),
});
