import { useEffect, useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import type { WarehouseItem } from '../../../utils/parseCatalog';

interface WarehouseHeaderProps {
    catalog: WarehouseItem[];
    viewMode: 'tree' | 'flat';
    currentFolderId: string | null;
    currentFolderName: string | null;
    isParsing: boolean;
    warehouseRootPage: number | string | undefined;
    loadCatalog: (force?: boolean) => void;
    setHeaderContext: (...args: any[]) => void;
    clearHeaderContext: () => void;
    setRightFooterCards: (cards: any[]) => void;
    setCurrentFolderId: (id: string | null) => void;
    setCurrentFolderName: (name: string | null) => void;
    setCurrentPage: (page: number) => void;
    setWarehouseRootPage: (page: number | string) => void;
}

export function WarehouseHeader({
    catalog,
    viewMode,
    currentFolderId,
    currentFolderName,
    isParsing,
    warehouseRootPage,
    loadCatalog,
    setHeaderContext,
    clearHeaderContext,
    setRightFooterCards,
    setCurrentFolderId,
    setCurrentFolderName,
    setCurrentPage,
    setWarehouseRootPage
}: WarehouseHeaderProps) {

    // ── Статистика папок для футера ──
    const folderStats = useMemo(() => {
        let rootCount = 0;
        let subCount = 0;
        let itemsCount = 0;

        for (const item of catalog) {
            if (item.isFolder) {
                const isRoot = item.parentId === "";
                if (isRoot) rootCount++;
                else subCount++;
            } else {
                itemsCount++;
            }
        }
        return { rootCount, subCount, totalFolders: rootCount + subCount, itemsCount };
    }, [catalog]);

    // ── Обновление карточек правого футера ──
    useEffect(() => {
        setRightFooterCards([
            {
                id: 'tree',
                label: 'Папки',
                shortLabel: 'Папка',
                count: folderStats.totalFolders,
                customCount: (
                    <div className="flex items-center gap-1 text-sm">
                        <span className="font-bold">{folderStats.totalFolders}</span>
                        <span className="opacity-50 font-normal">/</span>
                        <span className="font-normal opacity-90">{folderStats.rootCount}</span>
                        <span className="opacity-50 font-normal">/</span>
                        <span className="font-normal opacity-90">{folderStats.subCount}</span>
                    </div>
                ),
                tooltip: `Всего: ${folderStats.totalFolders} | Основные: ${folderStats.rootCount} | Вложенные: ${folderStats.subCount}`
            },
            {
                id: 'flat',
                label: 'Товары',
                shortLabel: 'Товар',
                count: folderStats.itemsCount,
                customCount: (
                    <span className="font-bold text-sm">{folderStats.itemsCount.toLocaleString('ru-RU')}</span>
                )
            },
        ]);
    }, [setRightFooterCards, folderStats]);

    // ── Обновление заголовка и экшенов ──
    useEffect(() => {
        const actions = [
            {
                id: 'refresh',
                icon: RefreshCw,
                label: isParsing ? 'Загрузка...' : 'Обновить',
                onClick: () => loadCatalog(true)
            }
        ];

        const pageContextStr = currentFolderId === null ? 'Склад' : 'Товары';

        let focusItemStr = '';
        if (currentFolderId === null) {
            focusItemStr = viewMode === 'tree' ? `Папки` : 'Все товары';
        } else {
            focusItemStr = currentFolderName || 'Папка';
        }

        // Построение иерархического дерева папок
        let folderTree: { id: string | null; name: string; level: number; isCurrent?: boolean; isSibling?: boolean }[] | undefined = undefined;

        if (currentFolderId !== null) {
            folderTree = [];
            const ancestors: WarehouseItem[] = [];
            let curr = catalog.find(i => i._id === currentFolderId);

            while (curr) {
                ancestors.unshift(curr);
                const pid = curr.parentId;
                curr = pid ? catalog.find(i => i._id === pid) : undefined;
            }

            folderTree.push({ id: null, name: 'Склад', level: 0 });

            for (let i = 0; i < ancestors.length - 1; i++) {
                const ancestor = ancestors[i];
                folderTree.push({
                    id: ancestor._id,
                    name: ancestor.name || 'Без названия',
                    level: i + 1
                });
            }

            const currentFolder = ancestors[ancestors.length - 1];
            const parentIdOfCurrent = currentFolder?.parentId || null;

            const siblings = catalog.filter(i => {
                return i.isFolder && i.parentId === parentIdOfCurrent;
            });

            siblings.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

            const siblingsLevel = ancestors.length;
            const sortedSiblings = siblings.filter(s => s._id !== currentFolderId);
            const currentObj = siblings.find(s => s._id === currentFolderId) || currentFolder;

            if (currentObj) {
                folderTree.push({
                    id: currentObj._id,
                    name: currentObj.name || 'Без названия',
                    level: siblingsLevel,
                    isCurrent: true
                });
            }

            for (const sibling of sortedSiblings) {
                folderTree.push({
                    id: sibling._id,
                    name: sibling.name || 'Без названия',
                    level: siblingsLevel,
                    isSibling: true
                });
            }
        }

        setHeaderContext(
            pageContextStr,
            focusItemStr,
            actions as any,
            {
                onClick: () => {
                    setCurrentFolderId(null);
                    setCurrentFolderName(null);
                    if (typeof warehouseRootPage === 'string') {
                        setWarehouseRootPage(1);
                    }
                },
                disabled: currentFolderId === null || isParsing
            },
            folderTree,
            (id: string | null) => {
                if (id === null) {
                    setCurrentFolderId(null);
                    setCurrentFolderName(null);
                } else {
                    const target = catalog.find(i => i._id === id);
                    if (target) {
                        setCurrentFolderId(target._id);
                        setCurrentFolderName(target.name);
                    }
                }
            }
        );

        return () => clearHeaderContext();
    }, [viewMode, currentFolderId, currentFolderName, isParsing, loadCatalog, setHeaderContext, clearHeaderContext, setCurrentPage, folderStats, catalog, setCurrentFolderId, setCurrentFolderName, warehouseRootPage, setWarehouseRootPage]);

    return null; // Headless component — managing side effects only
}
