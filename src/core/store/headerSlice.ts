import type { LucideIcon } from 'lucide-react';

/* ─── Типы ─── */

export interface HeaderAction {
    id: string;
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
}

export interface FolderNode {
    id: string | null;
    name: string;
    level: number;
    isCurrent?: boolean;
    isSibling?: boolean;
}

export interface HeaderSlice {
    pageContext: string;
    focusItem: string | null;
    headerActions: HeaderAction[];
    backAction?: { onClick: () => void; disabled?: boolean };
    folderTree?: FolderNode[];
    onFolderSelect?: (id: string | null) => void;

    setHeaderContext: (
        pageContext: string,
        focusItem: string | null,
        actions: HeaderAction[],
        backAction?: { onClick: () => void; disabled?: boolean },
        folderTree?: FolderNode[],
        onFolderSelect?: (id: string | null) => void
    ) => void;
    clearHeaderContext: () => void;
}

/* ─── Фабрика слайса ─── */

export const createHeaderSlice = (
    set: (fn: (s: HeaderSlice) => Partial<HeaderSlice>) => void,
): HeaderSlice => ({
    pageContext: '',
    focusItem: null,
    headerActions: [],
    backAction: undefined,
    folderTree: undefined,
    onFolderSelect: undefined,

    setHeaderContext: (pageContext, focusItem, actions, backAction, folderTree, onFolderSelect) =>
        set(() => ({ pageContext, focusItem, headerActions: actions, backAction, folderTree, onFolderSelect })),

    clearHeaderContext: () =>
        set(() => ({ pageContext: '', focusItem: null, headerActions: [], backAction: undefined, folderTree: undefined, onFolderSelect: undefined })),
});
