import { useMemo } from 'react';
import { User, Clock } from 'lucide-react';
import type { ColDef } from '../../../core/types/table';

export function useMastersColumns(
    showRawNames: boolean,
    showShortNames: boolean
): ColDef[] {
    return useMemo(() => [
        {
            id: 'index', label: '#', sortable: false, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Порядковый номер'
        },
        {
            id: 'type', label: <User className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Тип строки (Системный/Активный/Архив или Папка/Товар)'
        },
        {
            id: 'status', label: <Clock className="w-4 h-4 mx-auto text-muted-foreground" />, sortable: true, searchable: false,
            sticky: true,
            width: 'w-[50px]', minWidth: 'min-w-[50px]',
            align: 'center',
            isDragDisabled: true,
            tooltip: 'Состояние (Стаж или Диагностика ошибок)'
        },
        {
            id: 'name', label: 'Наименование', sortable: true, searchable: true,
            sticky: true,
            width: showRawNames ? 'w-[500px]' : (!showRawNames && showShortNames ? 'w-[200px]' : 'w-[350px]'),
            minWidth: showRawNames ? 'min-w-[500px]' : (!showRawNames && showShortNames ? 'min-w-[200px]' : 'min-w-[350px]'),
            freezeEnd: true,
            isDragDisabled: true,
            tooltip: 'Наименование позиции'
        },
        { id: 'category', label: 'Категория', sortable: true, searchable: true, width: 'w-[190px]', minWidth: 'min-w-[190px]', tooltip: 'Категория мастера' },
        { id: 'phone', label: 'Телефон', sortable: true, searchable: true, width: 'w-[190px]', minWidth: 'min-w-[190px]', align: 'center' },
        { id: 'payment', label: 'Оплата', sortable: true, searchable: true, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'center' },
        { id: 'bank', label: 'Банк', sortable: true, searchable: true, width: 'w-[175px]', minWidth: 'min-w-[175px]', align: 'center' },
        { id: 'city', label: 'Город', sortable: true, searchable: true, width: 'w-[150px]', minWidth: 'min-w-[150px]', align: 'center' },
        { id: 'date', label: 'Дата рег.', sortable: true, searchable: true, width: 'w-[140px]', minWidth: 'min-w-[140px]', align: 'center', tooltip: 'Дата регистрации в системе' },
        { id: 'notes', label: 'Заметки', sortable: true, searchable: true, width: 'w-[250px]', minWidth: 'min-w-[250px]' },
    ], [showRawNames, showShortNames]);
}
