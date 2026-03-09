import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { type Master } from '../../../api/client';
import { isSystemContact } from '../utils/masterHelpers';

interface MastersHeaderProps {
    masters: Master[];
    filteredMasters: Master[];
    pageSize: number;
    loadMasters: (force?: boolean) => void;
    setHeaderContext: (...args: any[]) => void;
    clearHeaderContext: () => void;
    setTotalRows: (n: number) => void;
    setTotalPages: (n: number) => void;
    setRightFooterCards: (cards: any[]) => void;
}

export function MastersHeader({
    masters,
    filteredMasters,
    pageSize,
    loadMasters,
    setHeaderContext,
    clearHeaderContext,
    setTotalRows,
    setTotalPages,
    setRightFooterCards
}: MastersHeaderProps) {

    // Обновляем счетчики
    useEffect(() => {
        setTotalRows(filteredMasters.length);
        setTotalPages(Math.ceil(filteredMasters.length / pageSize) || 1);

        const allCount = masters.length;
        const archiveCount = masters.filter(m => {
            const isSys = isSystemContact(m.name);
            return isSys ? false : !!m.isArchived;
        }).length;
        const activeCount = allCount - archiveCount;

        setRightFooterCards([
            {
                id: 'all', label: 'Все', shortLabel: 'ВСЕ', count: allCount,
                customCount: <span className="font-bold text-sm">{allCount.toLocaleString('ru-RU')}</span>
            },
            {
                id: 'active', label: 'Действующие', shortLabel: 'ДЕЙ', count: activeCount,
                customCount: <span className="font-bold text-sm">{activeCount.toLocaleString('ru-RU')}</span>
            },
            {
                id: 'archive', label: 'Архив', shortLabel: 'Архив', count: archiveCount,
                customCount: <span className="font-bold text-sm">{archiveCount.toLocaleString('ru-RU')}</span>
            },
        ]);
    }, [filteredMasters.length, masters, pageSize, setTotalRows, setTotalPages, setRightFooterCards]);

    // ── Установка контекста шапки ──
    useEffect(() => {
        setHeaderContext(
            'Мастера',
            null,
            [{ id: 'refresh', icon: RefreshCw, label: 'Обновить', onClick: () => loadMasters() }],
            { onClick: () => { }, disabled: true }
        );
        return () => clearHeaderContext();
    }, [setHeaderContext, clearHeaderContext, loadMasters]);

    return null; // Headless component
}
