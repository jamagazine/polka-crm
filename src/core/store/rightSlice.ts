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

export interface RightSlice {
    rightFooterCards: FooterCard[];
    activeRightCardId: string;

    setRightFooterCards: (cards: FooterCard[]) => void;
    setActiveRightCard: (id: string) => void;
}

/* ─── Фабрика слайса ─── */

export const createRightSlice = (
    set: (fn: (s: RightSlice) => Partial<RightSlice>) => void,
): RightSlice => ({
    rightFooterCards: [],
    activeRightCardId: '',

    setRightFooterCards: (cards) =>
        set((s) => {
            const isValid = cards.some(c => c.id === s.activeRightCardId);
            return {
                rightFooterCards: cards,
                activeRightCardId: isValid ? s.activeRightCardId : (cards[0]?.id ?? '')
            };
        }),

    setActiveRightCard: (id) => set(() => ({ activeRightCardId: id })),
});
