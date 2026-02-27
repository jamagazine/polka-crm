import { useState, useEffect } from 'react';

/**
 * Реактивный хук адаптивности.
 * Возвращает true, если ширина окна < breakpoint.
 * Использует единственный window.resize-листенер на экземпляр.
 */
export function useBreakpoint(breakpoint: number): boolean {
    const [isNarrow, setIsNarrow] = useState<boolean>(
        typeof window !== 'undefined' && window.innerWidth < breakpoint,
    );

    useEffect(() => {
        const handler = () => setIsNarrow(window.innerWidth < breakpoint);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, [breakpoint]);

    return isNarrow;
}
