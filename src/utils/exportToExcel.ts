import * as XLSX from 'xlsx';

export const exportToExcel = (data: any[], filename: string) => {
    if (!data || !data.length) return;

    // 1. Создаем лист из массива объектов
    const worksheet = XLSX.utils.json_to_sheet(data);

    // 2. Создаем новую книгу
    const workbook = XLSX.utils.book_new();

    // 3. Добавляем лист в книгу
    XLSX.utils.book_append_sheet(workbook, worksheet, "Данные");

    // 4. Генерируем и скачиваем файл
    XLSX.writeFile(workbook, `${filename}.xlsx`);
};

/**
 * Умный экспорт: экспортирует данные с учетом активных колонок и выделенных строк.
 * @param data - массив объектов (строки таблицы)
 * @param columns - массив { id, label } — только активные колонки
 * @param getValue - функция (row, colId) => string|number — извлекает значение ячейки
 * @param selectedIds - если непусто, экспортируются только строки с этими ID
 * @param idField - имя поля ID в объекте (по умолчанию 'id')
 * @param filename - имя файла
 */
export const exportSmartTable = (
    data: any[],
    columns: { id: string; label: string }[],
    getValue: (row: any, colId: string) => any,
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
    const exportData = rows.map(row => {
        const obj: Record<string, any> = {};
        columns.forEach(col => {
            // Пропускаем служебные колонки
            if (['index', 'select', 'type', 'status'].includes(col.id)) return;
            obj[typeof col.label === 'string' ? col.label : col.id] = getValue(row, col.id);
        });
        return obj;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Данные");

    const suffix = selectedIds && selectedIds.size > 0 ? `_selected_${selectedIds.size}` : '';
    XLSX.writeFile(workbook, `${filename}${suffix}.xlsx`);
};
