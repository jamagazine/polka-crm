import type { SectionId } from '../router';

/* ─── Типы ─── */

export interface PanelSlice {
    navCollapsed: boolean;
    contextCollapsed: boolean;
    activeSection: SectionId;

    toggleNav: (isMobile: boolean) => void;
    toggleContext: (isMobile: boolean) => void;
    collapseNav: () => void;
    collapseContext: () => void;
    setActiveSection: (section: SectionId) => void;
}

/* ─── Начальное состояние и экшены ─── */

export const createPanelSlice = (
    set: (fn: (s: PanelSlice) => Partial<PanelSlice>) => void,
): PanelSlice => ({
    navCollapsed: false,
    contextCollapsed: false,
    activeSection: 'main' as SectionId,

    toggleNav: (isMobile) =>
        set((state) => {
            const willOpen = state.navCollapsed;
            if (willOpen && isMobile) {
                return { navCollapsed: false, contextCollapsed: true };
            }
            return { navCollapsed: !state.navCollapsed };
        }),

    toggleContext: (isMobile) =>
        set((state) => {
            const willOpen = state.contextCollapsed;
            if (willOpen && isMobile) {
                return { contextCollapsed: false, navCollapsed: true };
            }
            return { contextCollapsed: !state.contextCollapsed };
        }),

    collapseNav: () => set(() => ({ navCollapsed: true })),
    collapseContext: () => set(() => ({ contextCollapsed: true })),
    setActiveSection: (section) => set(() => ({ activeSection: section })),
});
