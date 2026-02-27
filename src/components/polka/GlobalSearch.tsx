import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, X, Folder, Package, User, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { useDebounce } from '../../hooks/useDebounce';
import { CSS } from '../../utils/cssVars';
import { cn } from '../ui/utils';

export function GlobalSearch({ onClose }: { onClose: () => void }) {
    const navigate = useNavigate();
    const { masters, catalog, setWarehouseRootPage, setHighlightedIds } = usePanelStore(useShallow(state => ({
        masters: state.masters,
        catalog: state.catalog,
        setWarehouseRootPage: state.setWarehouseRootPage,
        setHighlightedIds: state.setHighlightedIds
    })));

    const [query, setQuery] = useState('');
    const [searchScope, setSearchScope] = useState<'all' | 'masters' | 'folders' | 'items'>('all');
    const [expandedSection, setExpandedSection] = useState<'masters' | 'folders' | 'items' | null>(null);
    const debouncedQuery = useDebounce(query, 300);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Click-outside listener
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    // Auto-focus the input
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Perform searches
    const { foundMasters, foundFolders, foundItems, totalMasters, totalFolders, totalItems } = useMemo(() => {
        const isBarcodeSearch = /^\d{8,}$/.test(query);
        const effectiveQuery = isBarcodeSearch ? query : debouncedQuery;

        if (!effectiveQuery || effectiveQuery.length < 2) {
            return { foundMasters: [], foundFolders: [], foundItems: [], totalMasters: 0, totalFolders: 0, totalItems: 0 };
        }

        const lowerQuery = effectiveQuery.toLowerCase();

        let fMasters = masters.filter(m =>
            (m.name || '').toLowerCase().includes(lowerQuery) ||
            (m.phones?.[0] || '').toLowerCase().includes(lowerQuery)
        );

        let fFolders = catalog.filter(c =>
            c.isFolder && (c.name || '').toLowerCase().includes(lowerQuery)
        );

        let fItems = catalog.filter(c =>
            !c.isFolder && (
                (c.name || '').toLowerCase().includes(lowerQuery) ||
                (c.article || '').toLowerCase().includes(lowerQuery) ||
                (c.code || '').toLowerCase().includes(lowerQuery) ||
                (c.barcode || '').toLowerCase().includes(lowerQuery)
            )
        );

        if (searchScope === 'masters') { fFolders = []; fItems = []; }
        if (searchScope === 'folders') { fMasters = []; fItems = []; }
        if (searchScope === 'items') { fMasters = []; fFolders = []; }

        const tMasters = fMasters.length;
        const tFolders = fFolders.length;
        const tItems = fItems.length;

        fMasters = expandedSection === 'masters' ? fMasters : fMasters.slice(0, 5);
        fFolders = expandedSection === 'folders' ? fFolders : fFolders.slice(0, 5);
        fItems = expandedSection === 'items' ? fItems : fItems.slice(0, 5);

        return { foundMasters: fMasters, foundFolders: fFolders, foundItems: fItems, totalMasters: tMasters, totalFolders: tFolders, totalItems: tItems };
    }, [query, debouncedQuery, masters, catalog, searchScope, expandedSection]);

    // Auto-navigate on exact barcode match (if exactly 1 result)
    useEffect(() => {
        const isBarcode = /^\d{8,}$/.test(query);
        if (isBarcode && foundItems.length === 1 && foundItems[0].barcode === query) {
            handleItemClick(foundItems[0]);
        }
    }, [query, foundItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const isBarcodeSearch = /^\d{8,}$/.test(query);
    const effectiveQuery = isBarcodeSearch ? query : debouncedQuery;
    const lowerQuery = effectiveQuery.toLowerCase();

    const hasResults = foundMasters.length > 0 || foundFolders.length > 0 || foundItems.length > 0;
    const showDropdown = effectiveQuery.length >= 2;

    const handleMasterClick = (masterId: string) => {
        setHighlightedIds(new Set([masterId]));
        navigate('/masters');
        onClose();
    };

    const handleFolderClick = (folderId: string) => {
        setWarehouseRootPage(folderId);
        navigate('/warehouse');
        onClose();
    };

    const handleItemClick = (item: typeof catalog[0]) => {
        setHighlightedIds(new Set([item.id]));
        setWarehouseRootPage(item.parentId || undefined);
        navigate('/warehouse');
        onClose();
    };


    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-xl relative flex items-center z-50"
        >
            <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Глобальный поиск (от 2 символов)..."
                className="w-full h-9 px-4 pr-10 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-sm"
                style={{ borderColor: CSS.border, backgroundColor: CSS.bgLight }}
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />

            {/* Dropdown */}
            {showDropdown && (
                <div
                    className="absolute z-50 top-12 left-0 w-full bg-white rounded-md shadow-lg border overflow-hidden flex flex-col"
                    style={{ borderColor: CSS.border, backgroundColor: CSS.bgLight }}
                >
                    {!hasResults ? (
                        <div className="flex flex-col max-h-[60vh] w-full">
                            <div className="flex items-center gap-2 p-3 border-b shrink-0 flex-wrap" style={{ borderColor: CSS.border }}>
                                {[
                                    { id: 'all', label: 'Все' },
                                    { id: 'masters', label: 'Мастера' },
                                    { id: 'folders', label: 'Папки' },
                                    { id: 'items', label: 'Товары' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setSearchScope(tab.id as any);
                                            setExpandedSection(null);
                                        }}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium border rounded-full transition-colors",
                                            searchScope === tab.id
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/30 hover:bg-muted text-muted-foreground border-transparent hover:border-border"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <div className="p-4 text-sm text-center text-muted-foreground">
                                Ничего не найдено
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col max-h-[60vh] w-full items-start overflow-hidden">
                            {/* Filter Chips */}
                            <div className="flex items-center gap-2 p-3 border-b shrink-0 flex-wrap w-full z-10 bg-white" style={{ borderColor: CSS.border, backgroundColor: CSS.bgLight }}>
                                {[
                                    { id: 'all', label: 'Все' },
                                    { id: 'masters', label: 'Мастера' },
                                    { id: 'folders', label: 'Папки' },
                                    { id: 'items', label: 'Товары' }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            setSearchScope(tab.id as any);
                                            setExpandedSection(null);
                                        }}
                                        className={cn(
                                            "px-3 py-1 text-xs font-medium border rounded-full transition-colors",
                                            searchScope === tab.id
                                                ? "bg-primary text-primary-foreground border-primary"
                                                : "bg-muted/30 hover:bg-muted text-muted-foreground border-transparent hover:border-border"
                                        )}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="overflow-y-auto w-full flex-1 min-h-0">
                                {/* MASTERS */}
                                {foundMasters.length > 0 && (
                                    <div className="py-2 w-full shrink-0">
                                        <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Мастера ({totalMasters})
                                        </div>
                                        {foundMasters.map(m => (
                                            <div
                                                key={m._id}
                                                onClick={() => handleMasterClick(m._id)}
                                                className="px-4 py-2 hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors"
                                            >
                                                {m.type === 'supplier' || m.type === 'company' ? (
                                                    <Building2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                                ) : (
                                                    <User className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                )}
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-sm font-medium truncate">{m.name}</span>
                                                    {m.phones?.[0] && <span className="text-xs text-muted-foreground truncate">{m.phones[0]}</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {totalMasters > 5 && (
                                            <div className="px-4 py-1.5 mt-1">
                                                <button
                                                    onClick={() => setExpandedSection(expandedSection === 'masters' ? null : 'masters')}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                                                >
                                                    {expandedSection === 'masters' ? 'Свернуть ↑' : `Показать все (${totalMasters}) ↓`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* FOLDERS */}
                                {foundFolders.length > 0 && (
                                    <div className="py-2 border-t w-full shrink-0" style={{ borderColor: CSS.border }}>
                                        <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Папки ({totalFolders})
                                        </div>
                                        {foundFolders.map(f => (
                                            <div
                                                key={f.id}
                                                onClick={() => handleFolderClick(f.id)}
                                                className="px-4 py-2 hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors"
                                            >
                                                <Folder className="w-4 h-4 text-blue-500 fill-blue-50 flex-shrink-0" />
                                                <span className="text-sm font-medium truncate flex-1">{f.name}</span>
                                            </div>
                                        ))}
                                        {totalFolders > 5 && (
                                            <div className="px-4 py-1.5 mt-1">
                                                <button
                                                    onClick={() => setExpandedSection(expandedSection === 'folders' ? null : 'folders')}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                                                >
                                                    {expandedSection === 'folders' ? 'Свернуть ↑' : `Показать все (${totalFolders}) ↓`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* ITEMS */}
                                {foundItems.length > 0 && (
                                    <div className="py-2 border-t w-full shrink-0" style={{ borderColor: CSS.border }}>
                                        <div className="px-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Товары ({totalItems})
                                        </div>
                                        {foundItems.map(i => (
                                            <div
                                                key={i.id}
                                                onClick={() => handleItemClick(i)}
                                                className={cn(
                                                    "px-4 py-2 hover:bg-muted/50 cursor-pointer flex items-center gap-3 transition-colors",
                                                    i.barcode === effectiveQuery && "bg-blue-50 border-y border-blue-100"
                                                )}
                                            >
                                                <Package className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                <div className="flex flex-col min-w-0 flex-1">
                                                    <span className="text-sm font-medium truncate">
                                                        {i.name}
                                                        {i.article && i.article.toLowerCase().includes(lowerQuery) && !i.name.toLowerCase().includes(lowerQuery) && (
                                                            <span className="ml-2 text-xs font-normal text-blue-500">(арт: {i.article})</span>
                                                        )}
                                                        {i.code && i.code.toLowerCase().includes(lowerQuery) && !i.name.toLowerCase().includes(lowerQuery) && (
                                                            <span className="ml-2 text-xs font-normal text-blue-500">(код: {i.code})</span>
                                                        )}
                                                    </span>
                                                    <div className="flex gap-2 text-xs text-muted-foreground truncate">
                                                        {i.article && <span>арт: {i.article}</span>}
                                                        {i.code && <span>код: {i.code}</span>}
                                                        {i.barcode && <span>bc: {i.barcode}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {totalItems > 5 && (
                                            <div className="px-4 py-1.5 mt-1">
                                                <button
                                                    onClick={() => setExpandedSection(expandedSection === 'items' ? null : 'items')}
                                                    className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors hover:underline"
                                                >
                                                    {expandedSection === 'items' ? 'Свернуть ↑' : `Показать все (${totalItems}) ↓`}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
