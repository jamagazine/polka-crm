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
export type FooterMode = 'idle' | 'search' | 'range-picker' | 'expanded';
export type RightTab = 'context' | 'calendar' | 'settings';

export interface DateRange {
    start: Date | null;
    end: Date | null;
}

export interface RightSlice {
    rightFooterCards: FooterCard[];
    activeRightCardId: string;
    dateRange: DateRange;
    calendarViewMode: CalendarViewMode;
    footerMode: FooterMode;
    viewMonth: number;
    viewYear: number;
    activeRightTab: RightTab;

    setRightFooterCards: (cards: FooterCard[]) => void;
    setActiveRightCard: (id: string) => void;
    setDateRange: (start: Date | null, end: Date | null) => void;
    setCalendarViewMode: (mode: CalendarViewMode) => void;
    setFooterMode: (mode: FooterMode) => void;
    setViewMonth: (month: number) => void;
    setViewYear: (year: number) => void;
    setActiveRightTab: (tab: RightTab) => void;
    resetCalendar: () => void;
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
    footerMode: 'idle',
    viewMonth: today().getMonth(),
    viewYear: today().getFullYear(),
    activeRightTab: 'calendar',

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

    setFooterMode: (mode) => set(() => ({ footerMode: mode })),

    setViewMonth: (month) => set(() => ({ viewMonth: month })),

    setViewYear: (year) => set(() => ({ viewYear: year })),

    setActiveRightTab: (tab) => set(() => ({ activeRightTab: tab })),

    resetCalendar: () => set(() => {
        const now = new Date();
        return {
            dateRange: { start: null, end: null },
            calendarViewMode: 'month',
            viewMonth: now.getMonth(),
            viewYear: now.getFullYear(),
            footerMode: 'idle',
        };
    })
});
