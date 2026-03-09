import { useState } from 'react';
import { Calendar, Settings, Wrench, ChevronRight, ChevronLeft, FileText, CaseSensitive, WrapText, Download, RotateCcw, Filter, Columns, ChevronDown, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router';
import { useShallow } from 'zustand/react/shallow';
import { usePanelStore } from '../../core/store';
import { formatNumber } from '../../utils/formatNumber';
import { CSS } from '../../utils/cssVars';
import { useBreakpoint } from '../../utils/useBreakpoint';
import { MOBILE_BREAKPOINT } from '../../core/config';
import { cn } from '../ui/utils';
import { Checkbox } from '../ui/checkbox';
import { SystemSettingsOverlay } from './SystemSettingsOverlay';
import { InteractiveCalendar } from '../../modules/right/InteractiveCalendar';
import { type RightTab } from '../../core/store/rightSlice';

export function RightPanel() {
  const {
    contextCollapsed, toggleContext,
    rightFooterCards, activeRightCardId, setActiveRightCard,
    mastersPrefs, warehousePrefs, productsPrefs,
    updateMastersPrefs, updateWarehousePrefs, updateProductsPrefs,
    resetColumnOrder,
    exportCurrentTable, selectedIds,
    statusFilter, setStatusFilter,
    seniorityFilter, setSeniorityFilter,
    showOnlySelected, setShowOnlySelected,
    hiddenColumns, toggleHiddenColumn,
    warehouseFolderId, warehouseView,
    columnPresets, activePresetId, applyPreset, savePreset, deletePreset,
    activeRightTab, setActiveRightTab
  } = usePanelStore(useShallow(state => ({
    contextCollapsed: state.contextCollapsed,
    toggleContext: state.toggleContext,
    rightFooterCards: state.rightFooterCards,
    activeRightCardId: state.activeRightCardId,
    setActiveRightCard: state.setActiveRightCard,
    mastersPrefs: state.mastersPrefs,
    warehousePrefs: state.warehousePrefs,
    productsPrefs: state.productsPrefs,
    updateMastersPrefs: state.updateMastersPrefs,
    updateWarehousePrefs: state.updateWarehousePrefs,
    updateProductsPrefs: state.updateProductsPrefs,
    resetColumnOrder: state.resetColumnOrder,
    exportCurrentTable: state.exportCurrentTable,
    selectedIds: state.selectedIds,
    statusFilter: state.statusFilter,
    setStatusFilter: state.setStatusFilter,
    seniorityFilter: state.seniorityFilter,
    setSeniorityFilter: state.setSeniorityFilter,
    showOnlySelected: state.showOnlySelected,
    setShowOnlySelected: state.setShowOnlySelected,
    hiddenColumns: state.hiddenColumns,
    toggleHiddenColumn: state.toggleHiddenColumn,
    warehouseFolderId: state.warehouseFolderId,
    warehouseView: state.warehouseView,
    columnPresets: state.columnPresets,
    activePresetId: state.activePresetId,
    applyPreset: state.applyPreset,
    savePreset: state.savePreset,
    deletePreset: state.deletePreset,
    activeRightTab: state.activeRightTab,
    setActiveRightTab: state.setActiveRightTab
  })));

  const isCollapsed = contextCollapsed;
  const isMobile = useBreakpoint(MOBILE_BREAKPOINT);

  const location = useLocation();
  const isWarehousePage = location.pathname.includes('warehouse');
  const isProductsPage = location.pathname.includes('products');
  const isMastersPage = !isWarehousePage && !isProductsPage;
  const isItemView = isWarehousePage && (warehouseFolderId !== null || warehousePrefs.warehouseView === 'products');

  const currentPrefs = isMastersPage ? mastersPrefs : (isItemView || isProductsPage ? productsPrefs : warehousePrefs);
  const updateCurrentPrefs = (prefs: any) => {
    if (isMastersPage) updateMastersPrefs(prefs);
    else if (isItemView || isProductsPage) updateProductsPrefs(prefs);
    else updateWarehousePrefs(prefs);
  };

  const handleToggleContext = () => toggleContext(isMobile);

  const headerSlots = [
    { icon: Calendar, label: 'Календарь', action: () => setActiveRightTab('calendar'), tab: 'calendar' as RightTab },
    { icon: Wrench, label: 'Инструменты', action: () => setActiveRightTab('settings'), tab: 'settings' as RightTab },
    { icon: null, label: '', tab: null },
    { icon: null, label: '', tab: null },
    { icon: isCollapsed ? ChevronLeft : ChevronRight, label: 'Свернуть', action: handleToggleContext, tab: null },
  ];

  const expandToTab = (tab: RightTab) => {
    setActiveRightTab(tab);
    if (isCollapsed) handleToggleContext();
  };

  const navButtons = [
    { icon: Calendar, label: 'Календарь', action: () => expandToTab('calendar') },
    { icon: Wrench, label: 'Инструменты', action: () => expandToTab('settings') },
  ];

  const footerCols = Math.max(rightFooterCards.length, 1);

  const hasSelection = selectedIds && selectedIds.size > 0;
  const [columnsMenuOpen, setColumnsMenuOpen] = useState(false);
  const [systemOverlayOpen, setSystemOverlayOpen] = useState(false);



  // Списки колонок для разных режимов
  const FOLDER_COLS = [
    { id: 'name', label: 'Наименование' },
    { id: 'skuCount', label: 'Позиций' },
    { id: 'stock', label: 'Остаток' },
    { id: 'totalValue', label: 'Сумма' },
    { id: 'zeroStockCount', label: '📦' },
    { id: 'minusesCount', label: '📉' },
    { id: 'moneyIssuesCount', label: '💸' }
  ];

  const ITEM_COLS = [
    { id: 'name', label: 'Наименование' },
    { id: 'code', label: 'Код' },
    { id: 'article', label: 'Артикул' },
    { id: 'barcode', label: 'Штрихкод' },
    { id: 'stock', label: 'Остаток' },
    { id: 'purchase', label: 'Закуп' },
    { id: 'price', label: 'Цена' },
    { id: 'profit', label: 'Прибыль' },
    { id: 'margin', label: 'Предел скидки' },
    { id: 'roi', label: 'Наценка %' },
    { id: 'sales', label: 'Продажи' }
  ];

  const MASTERS_COLS = [
    { id: 'name', label: 'Наименование' },
    { id: 'status', label: 'Стаж' },
    { id: 'skuCount', label: 'Позиций' },
    { id: 'totalValue', label: 'Сумма' },
    { id: 'moneyIssuesCount', label: 'Ошибки цен' },
    { id: 'zeroStockCount', label: 'Ошибки склада' },
    { id: 'category', label: 'Категория' },
    { id: 'phone', label: 'Телефон' },
    { id: 'payment', label: 'Оплата' },
    { id: 'bank', label: 'Банк' },
    { id: 'city', label: 'Город' },
    { id: 'date', label: 'Дата рег.' },
    { id: 'notes', label: 'Заметки' }
  ];

  const currentPageKey = isMastersPage ? 'masters' : (isProductsPage || isItemView ? 'warehouse_items' : 'warehouse_folders');
  const currentHidden = hiddenColumns?.[currentPageKey] || [];

  /** Контент центральной части в зависимости от вкладки */
  const renderContent = () => {
    switch (activeRightTab) {
      case 'calendar':
        return (
          <div className="bg-white h-full flex flex-col">
            <InteractiveCalendar />
          </div>
        );
      case 'settings':
        return (
          <div className="px-4 pb-4 flex flex-col gap-5">

            {/* ═══ Заголовок + Система ═══ */}
            <div className="flex items-center justify-between h-[50px] border-b border-border/50 -mx-4 px-4 mb-2">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">🔧 Инструменты</h3>
              <button
                onClick={() => setSystemOverlayOpen(true)}
                className={cn(
                  "p-1.5 rounded-md border transition-colors",
                  systemOverlayOpen
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/50"
                )}
                title="Системные настройки"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
            </div>



            {/* ═══ Секция: ВИД ТАБЛИЦЫ ═══ */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Вид таблицы</span>

              {/* Сегмент строк */}
              <div className="flex rounded-md border border-border overflow-hidden">
                <SegmentButton
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label="Ориг."
                  active={currentPrefs.showRawNames}
                  onClick={() => updateCurrentPrefs({ showRawNames: !currentPrefs.showRawNames })}
                />
                {(isMastersPage || isWarehousePage) && (
                  <SegmentButton
                    icon={<CaseSensitive className="w-3.5 h-3.5" />}
                    label="Кратко"
                    active={(currentPrefs as any).showShortNames ?? false}
                    onClick={() => updateCurrentPrefs({ showShortNames: !(currentPrefs as any).showShortNames })}
                  />
                )}
                <SegmentButton
                  icon={<WrapText className="w-3.5 h-3.5" />}
                  label="Перенос"
                  active={currentPrefs.wordWrap}
                  onClick={() => updateCurrentPrefs({ wordWrap: !currentPrefs.wordWrap })}
                  isLast
                />
              </div>

              {/* --- ПРЕСЕТЫ КОЛОНОК --- */}
              {(() => {
                const presetKey = isMastersPage ? 'masters' as const : (isItemView || isProductsPage ? 'warehouse_item' as const : 'warehouse_folder' as const);
                const presets = columnPresets[presetKey] || [];
                const currentActiveId = activePresetId[presetKey] || '';
                const activePreset = presets.find(p => p.id === currentActiveId);
                const isUserPreset = activePreset && !activePreset.isDefault;
                const allColsBase = isMastersPage ? MASTERS_COLS : (isItemView ? ITEM_COLS : FOLDER_COLS);

                return (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground uppercase opacity-80 pl-1">Пресеты колонок</span>
                    <select
                      value={currentActiveId}
                      onChange={(e) => {
                        if (e.target.value) applyPreset(presetKey, e.target.value);
                      }}
                      className="w-full h-8 px-2 text-xs rounded-md border border-border bg-white text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-pointer"
                    >
                      <option value="" disabled>— Выберите пресет —</option>
                      {presets.filter(p => p.isDefault).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      {presets.some(p => !p.isDefault) && (
                        <optgroup label="Мои пресеты">
                          {presets.filter(p => !p.isDefault).map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                    {isUserPreset && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Удалить пресет "${activePreset.name}"?`)) {
                            deletePreset(presetKey, activePreset.id);
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 text-xs h-7 w-full rounded-md border border-red-200 bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                        title="Удалить выбранный пресет"
                      >
                        🗑️ Удалить «{activePreset.name}»
                      </button>
                    )}
                    <div className="flex items-center w-full rounded-md border border-border overflow-hidden h-9 mt-1 shadow-sm">
                      <button
                        onClick={() => {
                          const confirmed = window.confirm("Сбросить порядок колонок для этой страницы?");
                          if (confirmed) {
                            const pageType = isWarehousePage ? 'warehouse' : (isProductsPage ? 'products' : 'masters');
                            resetColumnOrder(pageType);
                          }
                        }}
                        className="flex-1 h-full flex items-center justify-center gap-2 text-[11px] font-semibold bg-white text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all border-r border-border"
                        title="Сбросить порядок колонок"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        СБРОСИТЬ
                      </button>
                      <button
                        onClick={() => {
                          const name = window.prompt("Введите название пресета:");
                          if (!name || name.trim() === '') return;
                          savePreset(presetKey, name.trim(), allColsBase.map(c => c.id));
                        }}
                        className="flex-1 h-full flex items-center justify-center gap-2 text-[11px] font-semibold bg-white text-muted-foreground hover:bg-blue-50 hover:text-blue-600 transition-all"
                        title="Сохранить текущий набор колонок как пресет"
                      >
                        <Download className="w-3.5 h-3.5 opacity-70" />
                        СОХРАНИТЬ
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Состав колонок */}
              <button
                onClick={() => setColumnsMenuOpen(!columnsMenuOpen)}
                className={cn(
                  "flex items-center gap-2 text-xs font-medium h-9 px-3 rounded-md border transition-all w-full justify-center shadow-sm",
                  columnsMenuOpen
                    ? "border-primary bg-primary/5 text-primary"
                    : currentHidden.length > 0
                      ? "border-amber-200 bg-amber-50/50 text-amber-700 hover:bg-amber-100"
                      : "border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-100/80"
                )}
                title="Скрыть/показать отдельные колонки"
              >
                <Columns className="w-3.5 h-3.5" />
                {currentHidden.length > 0 ? `Состав колонок (скрыто ${currentHidden.length})` : 'Состав колонок'}
                <ChevronDown className={cn("w-3.5 h-3.5 ml-auto transition-transform duration-300", columnsMenuOpen && "rotate-180")} />
              </button>
              {columnsMenuOpen && (isWarehousePage || isMastersPage || isProductsPage) && (
                <div className="flex flex-col gap-0.5 pl-1 py-1 border rounded-md border-border bg-white/80">
                  {(isMastersPage
                    ? MASTERS_COLS
                    : (isItemView || isProductsPage ? ITEM_COLS : FOLDER_COLS)
                  ).map(col => {
                    const isHidden = currentHidden.includes(col.id);
                    return (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1 cursor-pointer hover:bg-muted/50 rounded text-xs"
                      >
                        <Checkbox
                          checked={!isHidden}
                          onCheckedChange={() => toggleHiddenColumn(currentPageKey, col.id)}
                        />
                        <span className={cn(isHidden && 'line-through text-muted-foreground')}>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ═══ Секция: ФИЛЬТРАЦИЯ ═══ */}
            <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: CSS.border }}>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Фильтрация</span>

              {/* Только выбранные */}
              <button
                disabled={!hasSelection}
                onClick={() => hasSelection && setShowOnlySelected(!showOnlySelected)}
                className={cn(
                  "flex items-center gap-2 text-xs font-medium h-8 px-3 rounded-md border transition-colors w-full justify-center",
                  showOnlySelected && hasSelection
                    ? "border-primary bg-primary/10 text-primary shadow-sm"
                    : hasSelection
                      ? "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100"
                      : "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                )}
                title="Показать только строки, отмеченные чекбоксами"
              >
                <Filter className="w-3.5 h-3.5" />
                Только выбранные
              </button>

              {/* Адаптивный сегмент фильтров */}
              {isWarehousePage && (
                <div className="flex rounded-md border border-border overflow-hidden">
                  <SegmentButton
                    icon={<span className="text-xs">📉</span>}
                    label="Минус"
                    active={statusFilter === 'minus'}
                    onClick={() => setStatusFilter(statusFilter === 'minus' ? null : 'minus')}
                  />
                  <SegmentButton
                    icon={<span className="text-xs">💸</span>}
                    label="Цена"
                    active={statusFilter === 'money'}
                    onClick={() => setStatusFilter(statusFilter === 'money' ? null : 'money')}
                  />
                  <SegmentButton
                    icon={<span className="text-xs">📦</span>}
                    label="Ноль"
                    active={statusFilter === 'stock'}
                    onClick={() => setStatusFilter(statusFilter === 'stock' ? null : 'stock')}
                  />
                  <SegmentButton
                    icon={<AlertTriangle className="w-3 h-3" />}
                    label="Комбо"
                    active={statusFilter === 'multi'}
                    onClick={() => setStatusFilter(statusFilter === 'multi' ? null : 'multi')}
                    isLast
                    title="Товары с двумя и более критическими ошибками"
                  />
                </div>
              )}

              {isMastersPage && (
                <div className="flex rounded-md border border-border overflow-hidden">
                  <SegmentButton
                    icon={<span className="text-xs">🐣</span>}
                    label="< 1м"
                    active={seniorityFilter === 'newbie'}
                    onClick={() => setSeniorityFilter(seniorityFilter === 'newbie' ? null : 'newbie')}
                    title="Новичок: до 30 дней"
                  />
                  <SegmentButton
                    icon={<span className="text-xs">🏅</span>}
                    label="< 1г"
                    active={seniorityFilter === 'regular'}
                    onClick={() => setSeniorityFilter(seniorityFilter === 'regular' ? null : 'regular')}
                    title="Постоянный: 1–12 мес."
                  />
                  <SegmentButton
                    icon={<span className="text-xs">🏆</span>}
                    label="< 3г"
                    active={seniorityFilter === 'expert'}
                    onClick={() => setSeniorityFilter(seniorityFilter === 'expert' ? null : 'expert')}
                    title="Опытный: 1–3 года"
                  />
                  <SegmentButton
                    icon={<span className="text-xs">👑</span>}
                    label="3г+"
                    active={seniorityFilter === 'veteran'}
                    onClick={() => setSeniorityFilter(seniorityFilter === 'veteran' ? null : 'veteran')}
                    isLast
                    title="Ветеран: более 3 лет"
                  />
                </div>
              )}
            </div>

            {/* ═══ Секция: ЭКСПОРТ ═══ */}
            <div className="flex flex-col gap-2 pt-3 border-t" style={{ borderColor: CSS.border }}>
              <button
                onClick={() => exportCurrentTable?.()}
                disabled={!exportCurrentTable}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium h-10 px-4 rounded-md border transition-colors w-full justify-center",
                  exportCurrentTable
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
                    : "border-border bg-muted/30 text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                <Download className="w-4 h-4" />
                {hasSelection ? `Экспорт выделенных (${selectedIds.size})` : 'Экспорт таблицы'}
              </button>
            </div>

          </div>
        );
      case 'context':
      default:
        return null;
    }
  };

  return (
    <aside
      className={`relative z-40 flex flex-col border-l transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-[280px]'
        }`}
      style={{ borderColor: CSS.border }}
    >
      {/* Header - 60px with 5 fixed slots */}
      <header className="h-[60px] border-b flex items-center" style={{ borderColor: CSS.border }}>
        {!isCollapsed ? (
          <div className="grid grid-cols-5 gap-0 w-full h-full">
            {headerSlots.map((slot, idx) => (
              <button
                key={idx}
                onClick={slot.action}
                className={`flex items-center justify-center transition-colors border-r last:border-r-0 ${slot.tab && slot.tab === activeRightTab ? 'bg-gray-100' : 'hover:bg-gray-100'
                  }`}
                style={{ borderColor: CSS.border }}
                title={slot.label}
              >
                {slot.icon && <slot.icon className="w-5 h-5" />}
              </button>
            ))}
          </div>
        ) : (
          <button
            onClick={handleToggleContext}
            className="w-full h-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto" style={{ backgroundColor: CSS.bgLight }}>
        {isCollapsed ? (
          <div className="flex flex-col gap-1 p-2">
            {navButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.action}
                className="w-full h-10 flex items-center justify-center rounded hover:bg-gray-200 transition-colors"
                title={btn.label}
              >
                <btn.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        ) : (
          renderContent()
        )}
      </div>

      {/* Footer — динамические карточки из стора */}
      {rightFooterCards.length > 0 && (
        <footer
          className={`border-t transition-all duration-300 ${isCollapsed ? 'flex flex-col' : 'grid'
            }`}
          style={{
            borderColor: CSS.border,
            ...(!isCollapsed ? { gridTemplateColumns: `repeat(${footerCols}, 1fr)` } : {}),
          }}
        >
          {!isCollapsed
            ? rightFooterCards.map((card) => {
              const isActive = card.id === activeRightCardId;
              return (
                <button
                  key={card.id}
                  onClick={() => setActiveRightCard(card.id)}
                  title={card.tooltip}
                  className={`h-[60px] flex flex-col items-center justify-center transition-colors border-r last:border-r-0 ${isActive ? 'text-white' : 'hover:bg-gray-100'
                    }`}
                  style={{
                    borderColor: CSS.border,
                    ...(isActive ? { backgroundColor: CSS.accent } : {}),
                  }}
                >
                  <span className={`text-[10px] uppercase ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                    {card.label}
                  </span>
                  <span className="text-sm font-semibold">
                    {card.customCount ? card.customCount : card.count.toLocaleString('ru-RU')}
                  </span>
                </button>
              );
            })
            : rightFooterCards.map((card) => {
              const isActive = card.id === activeRightCardId;
              return (
                <button
                  key={card.id}
                  onClick={() => setActiveRightCard(card.id)}
                  title={card.tooltip}
                  className={`h-[60px] flex flex-col items-center justify-center transition-colors border-b last:border-b-0 ${isActive ? 'text-white' : 'hover:bg-gray-100'
                    }`}
                  style={{
                    borderColor: CSS.border,
                    ...(isActive ? { backgroundColor: CSS.accent } : {}),
                  }}
                >
                  <span className={`text-[10px] uppercase ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                    {card.shortLabel}
                  </span>
                  <span className="text-sm font-semibold">{formatNumber(card.count)}</span>
                </button>
              );
            })}
        </footer>
      )}
      {/* SystemSettingsOverlay */}
      <SystemSettingsOverlay open={systemOverlayOpen} onClose={() => setSystemOverlayOpen(false)} isWarehousePage={isWarehousePage} isMastersPage={isMastersPage} isItemView={isItemView} />
    </aside>
  );
}

/* ── Компонент широкой кнопки-действия ── */
function ToolIconButton({
  icon, label, active, disabled, onClick
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={cn(
        "flex items-center gap-2 w-full h-8 px-3 rounded-md border text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border bg-white text-muted-foreground hover:bg-muted/50 hover:border-border",
        disabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

/* ── Компонент сегмента (inline-кнопка в группе) ── */
function SegmentButton({
  icon, label, active, onClick, isLast, title
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isLast?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title || label}
      className={cn(
        "flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors",
        !isLast && "border-r border-border",
        active
          ? "bg-primary/10 text-primary"
          : "bg-white text-muted-foreground hover:bg-muted/30"
      )}
    >
      <span className="leading-none">{icon}</span>
      <span className="leading-none">{label}</span>
    </button>
  );
}