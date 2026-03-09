import type { ReactNode } from 'react';

export type SortDir = 'asc' | 'desc' | null;

export type ColId =
    | 'index'
    | 'type'
    | 'status'
    | 'name'
    | 'category'
    | 'skuCount'
    | 'stock'
    | 'totalValue'
    | 'minusesCount'
    | 'moneyIssuesCount'
    | 'zeroStockCount'
    | 'code'
    | 'article'
    | 'barcode'
    | 'purchase'
    | 'price'
    | 'profit'
    | 'margin'
    | 'roi'
    | 'sales'
    | 'phone'
    | 'payment'
    | 'bank'
    | 'city'
    | 'date'
    | 'notes';

export interface SmartTableColDef {
    id: string;
    label?: string | ReactNode;
    dataKey?: string;
    sortable?: boolean;
    searchable?: boolean;
    renderHeader?: () => ReactNode;
    dropdownLabel?: string | ReactNode;

    // Styling & layout props
    sticky?: boolean;
    responsiveSticky?: boolean;
    stickyLeft?: string;
    stickyRight?: boolean;
    stickyRightOffset?: string;
    leftBorder?: boolean;
    align?: 'center' | 'left' | 'right';
    width?: string | number;
    minWidth?: string | number;
    maxWidth?: string | number;
    freezeEnd?: boolean;
    isDragDisabled?: boolean;
    tooltip?: string;
}

export interface ColDef extends SmartTableColDef {
    id: ColId;
    label: string | ReactNode;
    sortable: boolean;
    searchable: boolean;
    sticky?: boolean;
}
