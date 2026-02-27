import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createPanelSlice, type PanelSlice } from './panelSlice';
import { createHeaderSlice, type HeaderSlice } from './headerSlice';
import { createRightSlice, type RightSlice } from './rightSlice';
import { createAuthSlice, type AuthSlice } from './authSlice';
import { createDataSlice, type DataSlice } from './dataSlice';
import { createWarehouseSlice, type WarehouseSlice } from './warehouseSlice';

/* ─── Реэкспорт типов для обратной совместимости ─── */
export type { FooterCard } from './rightSlice';
export type { HeaderAction } from './headerSlice';

/* ─── Объединённый тип стора ─── */

type StoreState = PanelSlice & HeaderSlice & RightSlice & AuthSlice & DataSlice & WarehouseSlice;

/* ─── Единый стор ─── */

export const usePanelStore = create<StoreState>()(
    persist(
        (set) => ({
            ...createPanelSlice(set as Parameters<typeof createPanelSlice>[0]),
            ...createHeaderSlice(set as Parameters<typeof createHeaderSlice>[0]),
            ...createRightSlice(set as Parameters<typeof createRightSlice>[0]),
            ...createAuthSlice(set as Parameters<typeof createAuthSlice>[0]),
            ...createDataSlice(set as Parameters<typeof createDataSlice>[0]),
            ...createWarehouseSlice(set as Parameters<typeof createWarehouseSlice>[0]),
        }),
        {
            name: 'polka-auth-storage',
            partialize: (state) => ({
                isAuthenticated: state.isAuthenticated,
                userEmail: state.userEmail,
                lastMastersSync: state.lastMastersSync,
                lastCatalogSync: state.lastCatalogSync,
                mastersColumnOrder: state.mastersColumnOrder,
                warehouseColumnOrder: state.warehouseColumnOrder,
                productsColumnOrder: state.productsColumnOrder,
                columnPresets: state.columnPresets,
                activePresetId: state.activePresetId,
                hiddenColumns: state.hiddenColumns,
                mastersPrefs: state.mastersPrefs,
                warehousePrefs: state.warehousePrefs,
                productsPrefs: state.productsPrefs,
            }),
        },
    ),
);

/* ─── Вычисляемые селекторы режимов ─── */

export const useBothExpanded = () =>
    usePanelStore((s) => !s.navCollapsed && !s.contextCollapsed);

export const useOneCollapsed = () =>
    usePanelStore(
        (s) =>
            (s.navCollapsed && !s.contextCollapsed) ||
            (!s.navCollapsed && s.contextCollapsed),
    );

export const useBothCollapsed = () =>
    usePanelStore((s) => s.navCollapsed && s.contextCollapsed);
