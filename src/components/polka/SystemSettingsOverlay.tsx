import { useEffect, useRef } from 'react';
import { X, ClipboardCopy, Trash2, Terminal, Bug, Download, Upload, Share2, Database, Clock } from 'lucide-react';
import { useAppLogger } from '../../hooks/useAppLogger';
import { usePanelStore } from '../../core/store';
import { getLastSyncInfo } from '../../services/dataService';
import { cn } from '../ui/utils';

interface SystemSettingsOverlayProps {
    open: boolean;
    onClose: () => void;
    isWarehousePage: boolean;
    isMastersPage: boolean;
    isItemView: boolean;
}

const LOG_COLORS: Record<string, string> = {
    info: 'text-sky-400',
    warn: 'text-amber-400',
    error: 'text-red-400',
    success: 'text-emerald-400',
};

export function SystemSettingsOverlay({ open, onClose, isWarehousePage, isMastersPage, isItemView }: SystemSettingsOverlayProps) {
    const { logs, clearLogs, addLog } = useAppLogger();
    const scrollRef = useRef<HTMLDivElement>(null);

    // Авто-прокрутка вниз при новых логах
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // ── Сброс кэша ──
    const handleClearCache = async (type: 'catalog' | 'masters') => {
        const label = type === 'catalog' ? 'Склада' : 'Мастеров';
        const confirmed = window.confirm(`Вы уверены, что хотите очистить локальный кэш ${label}? Потребуется полная перекачка данных из интернета.`);
        if (!confirmed) return;
        try {
            const { db } = await import('../../core/db/database');
            if (type === 'catalog') {
                await db.catalog.clear();
                usePanelStore.setState({ catalog: [] });
            } else {
                await db.masters.clear();
                usePanelStore.setState({ masters: [] });
            }
            addLog(`[CACHE] Кэш ${label} очищен и UI обновлен`, 'success');
            alert(`Кэш очищен. Нажмите 'Обновить' в шапке.`);
        } catch (err) {
            addLog(`[CACHE] Ошибка очистки кэша: ${err}`, 'error');
        }
    };

    // ── Хелпер: скачать JSON-файл ──
    const downloadJson = (data: any, filename: string) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ── Экспорт всех Raw Data в один файл ──
    const handleExportAllRaw = () => {
        const state = usePanelStore.getState();
        const allData = {
            exportDate: new Date().toISOString(),
            masters: state.masters || [],
            folders: (state.catalog || []).filter((i: any) => i.isFolder),
            items: (state.catalog || []).filter((i: any) => !i.isFolder),
        };
        downloadJson(allData, `polka_raw_all_${new Date().toISOString().split('T')[0]}.json`);
        addLog(`[EXPORT] Всё в один файл: ${state.masters?.length || 0} мастеров, ${allData.folders.length} папок, ${allData.items.length} товаров`, 'success');
    };

    // ── Раздельный экспорт по типу ──
    const handleExportRawByType = (type: 'masters' | 'folders' | 'items') => {
        const state = usePanelStore.getState();
        let data: any[] = [];
        let filename = '';

        switch (type) {
            case 'masters':
                data = state.masters || [];
                filename = 'masters_raw.json';
                break;
            case 'folders':
                data = (state.catalog || []).filter((i: any) => i.isFolder);
                filename = 'folders_raw.json';
                break;
            case 'items':
                data = (state.catalog || []).filter((i: any) => !i.isFolder);
                filename = 'items_raw.json';
                break;
        }

        downloadJson(data, filename);
        addLog(`[EXPORT] ${type}: ${data.length} записей`, 'success');
    };

    // ── Экспорт базы (бэкап) ──
    const exportDatabase = async () => {
        try {
            const { db } = await import('../../core/db/database');
            const mastersData = await db.masters.toArray();
            const catalogData = await db.catalog.toArray();
            const state = usePanelStore.getState();

            const backup = {
                version: '0.8.9',
                timestamp: new Date().toISOString(),
                db: { masters: mastersData, catalog: catalogData },
                settings: {
                    columnPresets: state.columnPresets,
                    activePresetId: state.activePresetId,
                    hiddenColumns: state.hiddenColumns,
                    mastersPrefs: state.mastersPrefs,
                    warehousePrefs: state.warehousePrefs,
                    productsPrefs: state.productsPrefs,
                    mastersColumnOrder: state.mastersColumnOrder,
                    warehouseColumnOrder: state.warehouseColumnOrder,
                    productsColumnOrder: state.productsColumnOrder
                }
            };

            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `polka_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            addLog('Экспорт базы завершён ✓', 'success');
        } catch (err) {
            addLog(`Ошибка экспорта: ${err}`, 'error');
            alert('Ошибка при экспорте базы');
        }
    };

    // ── Импорт базы (бэкап) ──
    const importDatabase = async () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e: any) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    if (!backup.db || !backup.settings) throw new Error('Некорректный формат файла бэкапа');

                    if (!window.confirm('Вы уверены? Это действие ПОЛНОСТЬЮ заменит все текущие данные на данные из файла.')) return;

                    const { db } = await import('../../core/db/database');
                    await db.masters.clear();
                    await db.catalog.clear();

                    if (backup.db.masters) await db.masters.bulkAdd(backup.db.masters);
                    if (backup.db.catalog) await db.catalog.bulkAdd(backup.db.catalog);

                    usePanelStore.setState({
                        columnPresets: backup.settings.columnPresets,
                        activePresetId: backup.settings.activePresetId,
                        hiddenColumns: backup.settings.hiddenColumns,
                        mastersPrefs: backup.settings.mastersPrefs,
                        warehousePrefs: backup.settings.warehousePrefs,
                        productsPrefs: backup.settings.productsPrefs,
                        mastersColumnOrder: backup.settings.mastersColumnOrder,
                        warehouseColumnOrder: backup.settings.warehouseColumnOrder,
                        productsColumnOrder: backup.settings.productsColumnOrder
                    });

                    addLog('Импорт базы завершён ✓', 'success');
                    alert('Импорт успешно завершен! Страница будет перезагружена.');
                    window.location.reload();
                } catch (err) {
                    addLog(`Ошибка импорта: ${err}`, 'error');
                    alert('Ошибка при импорте: ' + (err as Error).message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    };

    // ── Отчёт для AI ──
    const generateReport = async () => {
        const state = usePanelStore.getState();
        const catalog = state.catalog || [];

        const foldersCount = catalog.filter(i => i.isFolder).length;
        const itemsCount = catalog.filter(i => !i.isFolder).length;

        const folderIds = new Set(catalog.filter(i => i.isFolder).map(i => i._id));
        const orphans = catalog.filter(i => i.parentId !== "" && !folderIds.has(i.parentId));

        const report = [
            `=== Отчёт Полка CRM ===`,
            `Дата: ${new Date().toLocaleString('ru-RU')}`,
            `DB: PolkaDB_v3`,
            ``,
            `Каталог: ${catalog.length} элементов`,
            `  Папок: ${foldersCount}`,
            `  Товаров: ${itemsCount}`,
            `  Сирот (parentId ≠ ни одна папка): ${orphans.length}`,
            ``,
            `Корневых папок: ${catalog.filter(i => i.isFolder && i.parentId === "").length}`,
            `Системных: ${catalog.filter(i => i.isSystem).length}`,
            `С фото: ${catalog.filter(i => !i.isFolder && i.pic && i.pic.length > 0).length}`,
            ``,
            `Последние 10 логов:`,
            ...(logs.slice(-10).map(l => `  [${l.type.toUpperCase()}] ${l.message}`)),
        ].join('\n');

        try {
            await navigator.clipboard.writeText(report);
            addLog('Отчёт скопирован в буфер обмена ✓', 'success');
        } catch {
            const textarea = document.createElement('textarea');
            textarea.value = report;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            addLog('Отчёт скопирован (fallback) ✓', 'success');
        }
    };

    // ── Hard Reset ──
    const handleHardReset = async () => {
        if (!window.confirm('⚠️ HARD RESET\n\nЭто действие ПОЛНОСТЬЮ удалит базу данных и перезагрузит страницу.\n\nВы уверены?')) return;
        try {
            const Dexie = (await import('dexie')).default;
            await Dexie.delete('PolkaDB_Final');
            // Очищаем также старые БД и localStorage
            await Dexie.delete('PolkaDB_v3').catch(() => { });
            localStorage.removeItem('last_sync_catalog');
            localStorage.removeItem('last_sync_masters');
            window.location.reload();
        } catch (err) {
            addLog(`Ошибка Hard Reset: ${err}`, 'error');
        }
    };

    if (!open) return null;

    return (
        <div className={cn("absolute inset-0 z-50 flex flex-col bg-white/95 backdrop-blur-sm", "animate-in fade-in duration-200")}>

            {/* ── Шапка ── */}
            <div className="flex items-center justify-between px-4 h-[60px] border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-indigo-500" />
                    <span className="text-sm font-bold text-foreground">Система</span>
                </div>
                <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/60 text-muted-foreground transition-colors" title="Закрыть">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* ── Статус свежести данных ── */}
            {(() => {
                const syncInfo = getLastSyncInfo();
                return (
                    <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border text-[11px] text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        <span>Склад: <b className="text-foreground">{syncInfo.catalog}</b></span>
                        <span className="text-muted-foreground/40">|</span>
                        <span>Мастера: <b className="text-foreground">{syncInfo.masters}</b></span>
                    </div>
                );
            })()}

            {/* ── Скролл-область ── */}
            <div className="flex-1 overflow-y-auto flex flex-col">

                {/* ═══ Управление данными ═══ */}
                <div className="flex flex-col gap-2 p-4 border-b border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">📦 Управление данными</span>

                    {/* Сброс кэша */}
                    <div className="flex gap-1.5">
                        <button onClick={() => handleClearCache('catalog')}
                            className="flex-1 flex items-center gap-1.5 text-xs font-medium h-8 px-2 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors justify-center">
                            <Trash2 className="w-3 h-3" /> Кэш склада
                        </button>
                        <button onClick={() => handleClearCache('masters')}
                            className="flex-1 flex items-center gap-1.5 text-xs font-medium h-8 px-2 rounded-md border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors justify-center">
                            <Trash2 className="w-3 h-3" /> Кэш мастеров
                        </button>
                    </div>

                    {/* Raw Data: тройная кнопка */}
                    <div className="pt-2 mt-1 border-t border-dashed border-border">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2 ml-1">Экспорт Raw Data</p>

                        <button onClick={handleExportAllRaw}
                            className="flex items-center gap-2 text-xs font-medium h-8 px-3 rounded-md border border-border bg-white hover:bg-muted/50 transition-colors w-full justify-center mb-1.5">
                            <Download className="w-3.5 h-3.5" /> Всё в один файл
                        </button>

                        <div className="flex gap-1.5">
                            <button onClick={() => handleExportRawByType('masters')}
                                className="flex-1 flex items-center gap-1 text-[11px] font-medium h-7 px-1.5 rounded-md border border-border bg-white hover:bg-muted/50 transition-colors justify-center">
                                Мастера
                            </button>
                            <button onClick={() => handleExportRawByType('folders')}
                                className="flex-1 flex items-center gap-1 text-[11px] font-medium h-7 px-1.5 rounded-md border border-border bg-white hover:bg-muted/50 transition-colors justify-center">
                                Склады
                            </button>
                            <button onClick={() => handleExportRawByType('items')}
                                className="flex-1 flex items-center gap-1 text-[11px] font-medium h-7 px-1.5 rounded-md border border-border bg-white hover:bg-muted/50 transition-colors justify-center">
                                Товары
                            </button>
                        </div>
                    </div>

                    {/* Перенос данных (Бэкап) */}
                    <div className="pt-2 mt-1 border-t border-dashed border-border">
                        <p className="text-[10px] text-muted-foreground uppercase font-bold mb-2 ml-1">Перенос данных</p>
                        <div className="flex flex-col gap-2">
                            <button onClick={exportDatabase}
                                className="flex items-center gap-3 text-[11px] font-bold h-10 px-4 rounded-md border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-700 transition-all justify-center shadow-sm"
                                title="Выгрузить всю базу и настройки в один файл для переноса на другое устройство">
                                <Share2 className="w-4 h-4" /> Экспорт базы (JSON)
                            </button>
                            <button onClick={importDatabase}
                                className="flex items-center gap-3 text-[11px] font-bold h-10 px-4 rounded-md border border-amber-200 bg-amber-50/80 hover:bg-amber-100 text-amber-700 transition-all justify-center shadow-sm"
                                title="Загрузить базу и настройки из файла с другого устройства">
                                <Upload className="w-4 h-4" /> Импорт базы (JSON)
                            </button>
                        </div>
                    </div>
                </div>

                {/* ═══ Диагностика ═══ */}
                <div className="flex flex-col gap-2 p-4 border-b border-border">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">🔍 Диагностика</span>

                    <button onClick={generateReport}
                        className="flex items-center gap-2 text-xs font-medium h-9 px-3 rounded-md border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors w-full justify-center"
                        title="Собрать метрики каталога и скопировать в буфер обмена">
                        <ClipboardCopy className="w-3.5 h-3.5" /> Отчёт для AI
                    </button>

                    <button onClick={handleHardReset}
                        className="flex items-center gap-2 text-xs font-medium h-9 px-3 rounded-md border border-red-300 bg-red-50 hover:bg-red-100 text-red-600 transition-colors w-full justify-center"
                        title="Удалить базу данных и перезагрузить страницу">
                        <Database className="w-3.5 h-3.5" /> Hard Reset
                    </button>
                </div>

                {/* ═══ Консоль ═══ */}
                <div className="flex flex-col flex-1 p-4 min-h-0">
                    <div className="flex items-center justify-between pb-2 shrink-0">
                        <div className="flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-green-500" />
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Консоль</span>
                            <span className="text-[10px] text-muted-foreground/60">({logs.length})</span>
                        </div>
                        <button onClick={clearLogs}
                            className="text-[10px] text-muted-foreground hover:text-red-500 transition-colors px-1.5 py-0.5 rounded hover:bg-red-50">
                            Очистить
                        </button>
                    </div>

                    <div ref={scrollRef}
                        className="flex-1 rounded-md bg-gray-950 border border-gray-800 overflow-y-auto font-mono text-[11px] leading-relaxed p-3 min-h-[120px]">
                        {logs.length === 0 ? (
                            <span className="text-gray-600 italic">Нет записей...</span>
                        ) : (
                            logs.map((log, idx) => {
                                const time = new Date(log.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                                return (
                                    <div key={idx} className="flex gap-2 hover:bg-white/5 px-1 rounded">
                                        <span className="text-gray-600 shrink-0 select-none">{time}</span>
                                        <span className={cn("break-all", LOG_COLORS[log.type] || 'text-gray-300')}>
                                            {log.message}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
