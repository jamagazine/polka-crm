import { useRef, useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Search, X, MoreVertical, ChevronDown, Folder, Home, MapPin, FolderOpen, ChevronUp, Plus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { Loader2, CheckCircle2, Rows2, BookOpen, Rows3, CheckSquare, XSquare } from 'lucide-react';
import { SmartPagination } from './SmartPagination';
import { GlobalSearch } from './GlobalSearch';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { AppRoutes } from '../../core/router';
import { useBreakpoint } from '../../utils/useBreakpoint';
import { CSS } from '../../utils/cssVars';
import { PAGE_SIZE_OPTIONS, type PageSize } from '../../core/store/dataSlice';
import { cn } from '../ui/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';

/** Квадратная кнопка-иконка */
const BTN_SQUARE =
  'w-9 h-9 flex-none flex items-center justify-center rounded-md bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors';

export function WorkArea() {
  const {
    pageContext, focusItem, headerActions, backAction,
    folderTree, onFolderSelect,
    currentPage, totalPages, setCurrentPage,
    totalRows, isParsing, parseProgress, isLoading,
    pageSize, setPageSize,
    lastMastersSync, lastCatalogSync,
    selectedIds, selectAllFiltered, clearSelection
  } = usePanelStore(useShallow(state => ({
    pageContext: state.pageContext,
    focusItem: state.focusItem,
    headerActions: state.headerActions,
    backAction: state.backAction,
    folderTree: state.folderTree,
    onFolderSelect: state.onFolderSelect,
    currentPage: state.currentPage,
    totalPages: state.totalPages,
    setCurrentPage: state.setCurrentPage,
    totalRows: state.totalRows,
    isParsing: state.isParsing,
    parseProgress: state.parseProgress,
    isLoading: state.isLoading,
    pageSize: state.pageSize,
    setPageSize: state.setPageSize,
    lastMastersSync: state.lastMastersSync,
    lastCatalogSync: state.lastCatalogSync,
    selectedIds: state.selectedIds,
    selectAllFiltered: state.selectAllFiltered,
    clearSelection: state.clearSelection
  })));

  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useBreakpoint(768);

  const isWarehouse = location.pathname.includes('warehouse');
  const syncTime = isWarehouse ? lastCatalogSync : lastMastersSync;

  const lastSyncText = useMemo(() => {
    if (!syncTime) return null;
    const d = new Date(syncTime);
    const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const now = new Date();

    if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
      return `Обновлено сегодня в ${timeStr}`;
    }
    return `Обновлено ${d.toLocaleDateString('ru-RU')} в ${timeStr}`;
  }, [syncTime]);

  const [isSearchActive, setIsSearchActive] = useState(false);

  const [showSiblings, setShowSiblings] = useState(false);

  // Сбрасываем показ соседей при смене контекста (папки)
  useEffect(() => {
    setShowSiblings(false);
  }, [focusItem]);

  /* ── Бургер-меню ── */
  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!burgerOpen) return;
    const close = (e: MouseEvent) => {
      if (burgerRef.current && !burgerRef.current.contains(e.target as Node)) {
        setBurgerOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [burgerOpen]);

  /* ── Hotkey: Сброс выделения по Escape ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем, если фокус находится в поле ввода (input, textarea)
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;
      if (target.isContentEditable) return;

      if (e.key === 'Escape' && selectedIds && selectedIds.size > 0) {
        clearSelection();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, clearSelection]);

  /* ── Рендер правых экшенов ── */
  const renderActions = () => {
    const refreshAction = headerActions.find(a => a.id === 'refresh');
    const otherActions = headerActions.filter(a => a.id !== 'refresh');
    const isBusy = isLoading || isParsing;
    const hasSelection = selectedIds && selectedIds.size > 0;

    return (
      <div className="flex items-center gap-2 justify-end w-full min-w-0">

        {/* Segmented Action Group */}
        {(refreshAction || hasSelection) && (
          <div className="flex items-center h-9 overflow-hidden rounded-md bg-secondary transition-all duration-300 ease-in-out border border-border/50 shrink-0 md:w-[130px] w-auto relative">
            <AnimatePresence mode="wait" initial={false}>
              {hasSelection ? (
                <motion.div
                  key="segmented"
                  initial={{ opacity: 0, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center w-full h-full"
                >
                  <button onClick={selectAllFiltered} className="flex-1 h-full min-w-[36px] flex items-center justify-center hover:bg-blue-500/10 text-blue-600 dark:text-blue-400 transition-colors" title="Выбрать всё">
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-border/50 flex-shrink-0" />
                  <button onClick={clearSelection} className="flex-1 h-full min-w-[36px] flex items-center justify-center hover:bg-red-500/10 text-red-600 dark:text-red-400 transition-colors" title="Сбросить выбор">
                    <XSquare className="w-4 h-4" />
                  </button>
                  <div className="w-px h-5 bg-border/50 flex-shrink-0" />
                  {refreshAction && (
                    <button disabled={isBusy} onClick={refreshAction.onClick} className="flex-1 h-full min-w-[36px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 text-secondary-foreground transition-colors disabled:opacity-50" title={refreshAction.label}>
                      <refreshAction.icon className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </motion.div>
              ) : (
                refreshAction && (
                  <motion.div
                    key="single"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center w-full h-full absolute inset-0"
                  >
                    <button disabled={isBusy} onClick={refreshAction.onClick} className="w-full h-full flex items-center justify-center gap-2 hover:bg-secondary/80 text-secondary-foreground transition-colors disabled:opacity-50 px-3 md:px-0">
                      <refreshAction.icon className={`w-4 h-4 flex-shrink-0 ${isBusy ? 'animate-spin' : ''}`} />
                      <span className="hidden md:inline text-sm font-medium">{refreshAction.label}</span>
                    </button>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Global Search Button */}
        <button
          onClick={() => setIsSearchActive(!isSearchActive)}
          className={BTN_SQUARE}
          title={isSearchActive ? "Закрыть поиск" : "Поиск"}
        >
          {isSearchActive ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
        </button>

        {/* Optional Additional Actions */}
        {otherActions.map((action) => (
          <button key={action.id} onClick={action.onClick} className={BTN_SQUARE} title={action.label}>
            <action.icon className="w-5 h-5" />
          </button>
        ))}
      </div>
    );
  };

  return (
    <main className="flex flex-col flex-1 min-w-0">

      {/* ═══ Header ═══ */}
      <header
        className="h-[60px] border-b flex justify-between w-full flex-none items-center px-4 relative"
        style={{ borderColor: CSS.border }}
      >
        {/* Левая зона: Кнопка назад / Контекст */}
        <div className="flex items-start md:items-center gap-2 h-full py-2 md:py-1 justify-self-start min-w-0">
          <button
            onClick={backAction ? backAction.onClick : () => navigate(-1)}
            disabled={backAction?.disabled}
            className={`w-9 h-9 flex-none flex items-center justify-center rounded-md transition-colors ${backAction?.disabled
              ? 'bg-secondary/50 text-secondary-foreground/30 cursor-not-allowed'
              : 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
              }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col items-start min-w-0 justify-center h-full leading-tight">
            {pageContext && (
              folderTree && folderTree.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-1.5 hover:text-primary transition-colors focus:outline-none text-lg font-bold text-foreground truncate">
                      {pageContext}
                      <ChevronDown className="w-5 h-5 opacity-50" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[300px] max-h-[60vh] overflow-y-auto">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider sticky top-0 bg-white z-10">
                        Структура папок
                      </DropdownMenuLabel>
                      {folderTree.map((node, index) => {
                        const isSelected = node.name === pageContext || node.name === focusItem || (node.id === null && !focusItem);

                        // Определяем тип папки для иконки:
                        // Если это не последняя (выбранная) папка и не ее соседи, значит это предок (FolderOpen)
                        // Последний уровень в массиве - это соседи и сама текущая папка
                        const isAncestor = !isSelected && (!node.isSibling && !node.isCurrent) && node.id !== null;

                        if (node.isSibling && !showSiblings) return null;

                        return (
                          <DropdownMenuItem
                            key={node.id ?? 'root'}
                            onClick={() => onFolderSelect && onFolderSelect(node.id)}
                            className={cn(
                              "cursor-pointer gap-2 mb-0.5 last:mb-0",
                              isSelected && "bg-secondary text-secondary-foreground font-medium"
                            )}
                            style={{ paddingLeft: `${(node.level * 16) + 8}px` }}
                          >
                            {node.id === null ? (
                              <Home className="w-4 h-4 shrink-0 text-slate-500" />
                            ) : isSelected ? (
                              <MapPin className="w-4 h-4 shrink-0 text-blue-600" />
                            ) : isAncestor ? (
                              <FolderOpen className="w-4 h-4 shrink-0 text-slate-400" />
                            ) : (
                              <Folder className="w-4 h-4 shrink-0 text-slate-400" />
                            )}
                            <span className="truncate">{node.name}</span>
                          </DropdownMenuItem>
                        );
                      })}
                      {(() => {
                        const siblingsCount = folderTree.filter(n => n.isSibling).length;
                        if (siblingsCount === 0) return null;

                        const indentLevel = folderTree.find(n => n.isCurrent)?.level ?? folderTree[folderTree.length - 1]?.level ?? 0;

                        return (
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setShowSiblings(!showSiblings);
                            }}
                            className="cursor-pointer gap-1 mt-1 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 focus:bg-secondary/50 transition-colors"
                            style={{ paddingLeft: `${(indentLevel * 16) + 8}px` }}
                          >
                            {showSiblings ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                            <span>{showSiblings ? 'Скрыть соседние' : `Показать соседние (${siblingsCount})`}</span>
                          </DropdownMenuItem>
                        );
                      })()}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-lg font-bold text-foreground truncate">{pageContext}</span>
              )
            )}
            {focusItem && (
              <span className="md:hidden text-sm text-gray-500 truncate max-w-[200px] mt-[-2px]">
                {focusItem}
              </span>
            )}
          </div>
        </div>

        {/* Центральная зона: Фокус/Поиск */}
        <div className="justify-self-center w-full justify-center min-w-0 h-full px-2 md:px-4 items-center flex flex-1">
          <AnimatePresence mode="wait">
            {isSearchActive ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="w-full max-w-xl relative flex items-center"
              >
                <GlobalSearch onClose={() => setIsSearchActive(false)} />
              </motion.div>
            ) : (
              focusItem && (
                <motion.span
                  key="title"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-semibold text-lg truncate whitespace-nowrap px-2 hidden md:block"
                >
                  {focusItem}
                </motion.span>
              )
            )}
          </AnimatePresence>
        </div>

        {/* Правая зона: Экшены */}
        <div className="justify-self-end h-full flex items-center">
          {renderActions()}
        </div>


      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: CSS.bgLight }}>
        <AppRoutes />
      </div>

      {/* ═══ Footer ═══ */}
      <footer
        className="h-[60px] border-t flex md:grid md:grid-cols-[1fr_auto_1fr] justify-between items-center w-full px-4 gap-2 md:gap-4 overflow-hidden"
        style={{ borderColor: CSS.border }}
      >
        {/* ── Левая зона: гибридный статус ── */}
        <div className="flex-1 min-w-0 md:flex-none flex-shrink h-6 flex items-center justify-start justify-self-start">
          <AnimatePresence mode="wait">
            {isParsing || isLoading ? (
              <motion.div
                key="parsing"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-1.5 text-sm text-amber-600 truncate"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                <span className="whitespace-nowrap font-medium">{parseProgress || 'Загрузка...'}</span>
              </motion.div>
            ) : (
              <div className="flex items-center gap-1.5 text-sm h-6">
                <TooltipProvider delayDuration={400}>

                  {/* Зеленая галочка с тултипом даты обновления */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center cursor-default min-w-0">
                        <CheckCircle2
                          className="w-3.5 h-3.5 flex-shrink-0 transition-colors hover:opacity-80"
                          style={{ color: CSS.green }}
                        />
                      </div>
                    </TooltipTrigger>
                    {lastSyncText && (
                      <TooltipContent side="top" className="text-xs">
                        <p>{lastSyncText}</p>
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <div className="flex items-center gap-1.5">
                    {/* Строки (или Выделение) */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className={cn(
                          "flex items-center gap-0.5 cursor-default transition-colors",
                          selectedIds && selectedIds.size > 0
                            ? "text-blue-600 dark:text-blue-500 font-medium"
                            : "text-gray-600 hover:text-gray-900"
                        )}>
                          <Rows2 className="w-3 h-3 flex-shrink-0" />
                          <span className={cn("tabular-nums whitespace-nowrap", !(selectedIds && selectedIds.size > 0) && "font-medium")}>
                            {selectedIds && selectedIds.size > 0 ? (
                              `Выбрано: ${selectedIds.size} из ${totalRows}`
                            ) : (
                              totalRows >= 1000
                                ? `${(totalRows / 1000).toFixed(1)}к`
                                : String(totalRows || '—')
                            )}
                          </span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {selectedIds && selectedIds.size > 0 ? (
                          <p>Выбрано строк: {selectedIds.size} из {totalRows.toLocaleString('ru-RU')}</p>
                        ) : (
                          <p>{totalRows.toLocaleString('ru-RU')} записей всего</p>
                        )}
                      </TooltipContent>
                    </Tooltip>

                    <span className="text-gray-300 select-none">·</span>

                    {/* Страницы */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-0.5 text-gray-600 cursor-default hover:text-gray-900 transition-colors">
                          <BookOpen className="w-3 h-3 flex-shrink-0" />
                          <span className="font-medium tabular-nums">{totalPages}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>{totalPages} страниц всего</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                </TooltipProvider>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Центр: пагинация ── */}
        <div className="flex-shrink-0 flex justify-center justify-self-center">
          <SmartPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div >

        {/* ── Правая зона: размер страницы ── */}
        <div className="flex-1 min-w-0 md:flex-none flex justify-end justify-self-end">
          <Select
            value={String(pageSize)}
            onValueChange={(val) => setPageSize(Number(val) as PageSize)}
          >
            <SelectTrigger className="md:w-[70px] w-8 h-8 p-0 md:px-3 text-xs flex justify-center items-center [&>svg]:hidden md:[&>svg]:block">
              <span className="hidden md:inline">
                <SelectValue />
              </span>
              <span className="md:hidden text-sm font-medium">
                {pageSize}
              </span>
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)} className="text-xs">
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </footer>
    </main>
  );
}