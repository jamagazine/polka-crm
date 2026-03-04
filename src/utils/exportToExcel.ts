import * as XLSX from 'xlsx';

// ─── Маппинг иконок-заголовков в текст для Excel ────────────────────────────

const HEADER_TEXT_MAP: Record<string, string> = {
    '📦': 'Нулевой остаток',
    '📉': 'Отрицательный остаток',
    '💸': 'Проблема с ценой',
};

// ─── Вспомогательные функции для умных имён ─────────────────────────────────

/** Убирает запрещённые символы Windows из имени файла */
const sanitizeFilename = (name: string): string =>
    name.replace(/[/\\:*?"<>|]/g, '').trim();

/**
 * Генерирует имя файла: [BaseName] - [DD.MM.YYYY] - [Counter].xlsx
 * Counter (01, 02...) отслеживается в sessionStorage за текущую сессию.
 */
const generateExportFilename = (baseName: string): string => {
    const clean = sanitizeFilename(baseName) || 'Export';

    // Дата в формате ДД.ММ.ГГГГ
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const dateStr = `${dd}.${mm}.${yyyy}`;

    // Счётчик скачиваний из sessionStorage
    const storageKey = `export_counter_${clean}`;
    const prev = parseInt(sessionStorage.getItem(storageKey) || '0', 10);
    const counter = prev + 1;
    sessionStorage.setItem(storageKey, String(counter));

    const counterStr = String(counter).padStart(2, '0');

    return `${clean} - ${dateStr} - ${counterStr}`;
};

// ─── Вспомогательные функции оформления Excel ─────────────────────────────

const applyStylesAndWidths = (worksheet: XLSX.WorkSheet, data: any[]) => {
    // 1. Авто-ширина колонок
    if (data.length > 0) {
        const objectMaxLength: number[] = [];
        const keys = Object.keys(data[0]);

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            keys.forEach((key, j) => {
                const value = row[key];
                const valueStr = value !== null && value !== undefined ? String(value) : '';
                const length = Math.max(valueStr.length, key.length) + 2; // +2 для отступов
                // Ограничиваем максимальную ширину до 60 символов, чтобы не было гигантских колонок
                const finalLength = Math.min(length, 60);

                if (objectMaxLength[j]) {
                    objectMaxLength[j] = Math.max(objectMaxLength[j], finalLength);
                } else {
                    objectMaxLength[j] = finalLength;
                }
            });
        }
        worksheet['!cols'] = objectMaxLength.map(w => ({ wch: w }));
    }

    // 2. Стилистика ячеек (перенос текста и выравнивание по верхнему краю)
    for (const cellAddress in worksheet) {
        if (cellAddress[0] === '!') continue; // Пропускаем мета-поля
        const cell = worksheet[cellAddress];
        if (!cell.s) cell.s = {};
        cell.s.alignment = { wrapText: true, vertical: 'top' };
    }
};

// ─── Экспорт ────────────────────────────────────────────────────────────────

export const exportToExcel = (data: any[], filename: string) => {
    if (!data || !data.length) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    applyStylesAndWidths(worksheet, data);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Данные");

    const smartName = generateExportFilename(filename);
    XLSX.writeFile(workbook, `${smartName}.xlsx`);
};

/**
 * Умный экспорт: экспортирует данные с учетом активных колонок и выделенных строк.
 * @param data - массив объектов (строки таблицы)
 * @param columns - массив { id, label } — только активные колонки
 * @param getValue - функция (row, colId, rowIndex) => string|number — извлекает значение ячейки
 * @param selectedIds - если непусто, экспортируются только строки с этими ID
 * @param idField - имя поля ID в объекте (по умолчанию 'id')
 * @param filename - базовое имя файла (будет дополнено датой и счётчиком)
 */
export const exportSmartTable = (
    data: any[],
    columns: { id: string; label: string }[],
    getValue: (row: any, colId: string, rowIndex: number) => any,
    selectedIds?: Set<string>,
    idField: string = 'id',
    filename: string = 'Export'
) => {
    if (!data || !data.length || !columns.length) return;

    // Фильтруем строки по selectedIds (если есть)
    const rows = selectedIds && selectedIds.size > 0
        ? data.filter(row => selectedIds.has(row[idField]))
        : data;

    if (rows.length === 0) return;

    // Строим массив объектов { label: value }
    const exportData = rows.map((row, index) => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
            // Пропускаем служебные колонки
            if (['select'].includes(col.id)) return;
            const header = typeof col.label === 'string'
                ? (HEADER_TEXT_MAP[col.label] || col.label)
                : col.id;
            obj[header] = getValue(row, col.id, index);
        });
        return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    applyStylesAndWidths(worksheet, exportData);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Данные");

    // Умное имя с датой и счётчиком
    const smartName = generateExportFilename(sanitizeFilename(filename));
    XLSX.writeFile(workbook, `${smartName}.xlsx`);
};
