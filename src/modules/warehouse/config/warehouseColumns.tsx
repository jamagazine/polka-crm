import { useMemo } from 'react';
import { Package, Folder, Activity } from 'lucide-react';
import type { ColDef } from '../../../core/types/table';

export function useFolderColumns(
    showRawNames: boolean,
    showShortNames: boolean,
    warehouseView: string
): ColDef[] {
    return useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <Folder className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            dropdownLabel: '📁 Тип (Папка)',
            sticky: warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Тип строки (Системный/Активный/Архив или Папка/Товар)'
        },
        {
            id: 'status', label: <Activity className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            dropdownLabel: '📈 Состояние',
            sticky: warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Состояние (Стаж или Диагностика ошибок)'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            sticky: warehouseView !== 'products',
            width: showRawNames ? 'w-[500px]' : (!showRawNames && showShortNames ? 'w-[200px]' : 'w-[350px]'),
            minWidth: showRawNames ? 'min-w-[500px]' : (!showRawNames && showShortNames ? 'min-w-[200px]' : 'min-w-[350px]'),
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Наименование позиции'
        },
        { id: 'category', label: 'Категория', sortable: true, searchable: true, width: 'w-[200px]', minWidth: 'min-w-[200px]' },
        { id: 'skuCount', label: 'Позиций', sortable: true, searchable: false, width: 'w-[125px]', minWidth: 'min-w-[125px]', align: 'right', tooltip: 'Количество товарных позиций в папке' },
        { id: 'stock', label: 'Остаток', sortable: true, searchable: false, width: 'w-[140px]', minWidth: 'min-w-[140px]', align: 'right' },
        { id: 'totalValue', label: 'Сумма', sortable: true, searchable: false, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'right', tooltip: 'Общая сумма остатков в папке' },
        { id: 'zeroStockCount', label: '📦', dropdownLabel: '📦 Нулевой остаток', sortable: true, searchable: false, width: 'w-[80px]', minWidth: 'min-w-[80px]', align: 'center', tooltip: 'Нулевые остатки' },
        { id: 'minusesCount', label: '📉', dropdownLabel: '📉 Минусовой остаток', sortable: true, searchable: false, width: 'w-[80px]', minWidth: 'min-w-[80px]', align: 'center', tooltip: 'Минусовые остатки' },
        { id: 'moneyIssuesCount', label: '💸', dropdownLabel: '💸 Проблема с ценой', sortable: true, searchable: false, width: 'w-[80px]', minWidth: 'min-w-[80px]', align: 'center', tooltip: 'Ошибки в ценах' }
    ], [showRawNames, showShortNames, warehouseView]);
}

export function useProductColumns(
    showRawNames: boolean,
    showShortNames: boolean,
    warehouseView: string
): ColDef[] {
    return useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <Package className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            dropdownLabel: '🖼️ Фото',
            sticky: warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Фото товара'
        },
        {
            id: 'status', label: <span title="Движение" className="flex items-center justify-center w-full h-full"><Activity className="w-4 h-4 text-muted-foreground" /></span>, sortable: true, searchable: false,
            dropdownLabel: '📊 Движение/Ошибки',
            sticky: warehouseView !== 'products',
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Движение или ошибки'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            sticky: warehouseView !== 'products',
            width: showRawNames ? 'w-[500px]' : (!showRawNames && showShortNames ? 'w-[200px]' : 'w-[350px]'),
            minWidth: showRawNames ? 'min-w-[500px]' : (!showRawNames && showShortNames ? 'min-w-[200px]' : 'min-w-[350px]'),
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Наименование позиции'
        },
        { id: 'category', label: 'Категория', sortable: true, searchable: true, width: 'w-[180px]', minWidth: 'min-w-[180px]' },
        { id: 'code', label: 'Код', sortable: true, searchable: true, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'center', tooltip: 'Внутренний код CloudShop' },
        { id: 'article', label: 'Артикул', sortable: true, searchable: true, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'center', tooltip: 'Пользовательский артикул' },
        { id: 'barcode', label: 'Штрихкод', sortable: true, searchable: true, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'center', tooltip: 'Штрихкод товара' },
        { id: 'stock', label: 'Остаток', sortable: true, searchable: false, width: 'w-[110px]', minWidth: 'min-w-[110px]', align: 'right' },
        { id: 'purchase', label: 'Закуп (₽)', sortable: true, searchable: false, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'right', tooltip: 'Цена закупки' },
        { id: 'price', label: 'Цена (₽)', sortable: true, searchable: false, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'right', tooltip: 'Цена продажи' },
        { id: 'profit', label: 'Прибыль (₽)', sortable: true, searchable: false, width: 'w-[140px]', minWidth: 'min-w-[140px]', align: 'right', tooltip: 'Прибыль: Цена - Закуп' },
        { id: 'margin', label: 'Предел скидки', sortable: true, searchable: false, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'right', tooltip: 'Маржинальность: показывает вашу долю в итоговой цене. Это максимальный процент скидки, который вы можете дать, чтобы не сработать в убыток.' },
        { id: 'roi', label: 'Наценка %', sortable: true, searchable: false, width: 'w-[130px]', minWidth: 'min-w-[130px]', align: 'right', tooltip: 'ROI (Окупаемость): показывает, сколько процентов прибыли вы получаете сверх суммы, которую выплачиваете мастеру.' },
        { id: 'sales', label: 'Продажи', sortable: true, searchable: false, width: 'w-[120px]', minWidth: 'min-w-[120px]', align: 'right', tooltip: 'Количество продаж' }
    ], [showRawNames, showShortNames, warehouseView]);
}
