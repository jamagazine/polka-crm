import { useRef, useEffect, useCallback, useState } from 'react';
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { PageSelector } from './PageSelector';
import { useBreakpoint } from '../../utils/useBreakpoint';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface SmartPaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

/**
 * Три режима пагинации:
 * — Мобайл (useBreakpoint < 768): < [Badge X] >  — ультра-компакт
 * — Узкий контейнер (< 500px): < PageSelector >
 * — Полный режим: << < 1 2 3 ... > >>
 */
export function SmartPagination({ currentPage, totalPages, onPageChange }: SmartPaginationProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const isMobile = useBreakpoint(1024);
    const [isMobilePopoverOpen, setIsMobilePopoverOpen] = useState(false);
    const [mobileInputPage, setMobileInputPage] = useState(currentPage.toString());

    useEffect(() => {
        if (isMobilePopoverOpen) {
            setMobileInputPage(currentPage.toString());
        }
    }, [isMobilePopoverOpen, currentPage]);

    /** Генерация окна из 5 номеров страниц вокруг текущей */
    const getPageNumbers = (): number[] => {
        const windowSize = 5;
        if (totalPages <= windowSize) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }
        let start = currentPage - Math.floor(windowSize / 2);
        let end = start + windowSize - 1;
        if (start < 1) { start = 1; end = windowSize; }
        if (end > totalPages) { end = totalPages; start = totalPages - windowSize + 1; }
        const pages: number[] = [];
        for (let i = start; i <= end; i++) pages.push(i);
        return pages;
    };

    const btnBase =
        'w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100 transition-colors disabled:opacity-50';

    return (
        <div ref={containerRef} className="flex items-center justify-center gap-1 w-full">

            {/* ─── Режим 1: Мобайл — ультра-компакт: << < Popover > >> ─── */}
            {isMobile ? (
                <>
                    <button
                        className={btnBase}
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(1)}
                        title="Первая"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                        className={btnBase}
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        title="Назад"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <Popover open={isMobilePopoverOpen} onOpenChange={setIsMobilePopoverOpen}>
                        <PopoverTrigger asChild>
                            <button className="px-3 py-1 text-xs font-medium border rounded hover:bg-gray-100 transition-colors">
                                {currentPage}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent side="top" className="w-40 p-3">
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    const val = parseInt(mobileInputPage, 10);
                                    if (!isNaN(val)) {
                                        onPageChange(Math.min(totalPages, Math.max(1, val)));
                                    }
                                    setIsMobilePopoverOpen(false);
                                }}
                                className="flex items-center gap-2"
                            >
                                <Input
                                    type="number"
                                    min={1}
                                    max={totalPages}
                                    value={mobileInputPage}
                                    onChange={(e) => setMobileInputPage(e.target.value)}
                                    className="h-8 text-sm px-2"
                                    autoFocus
                                />
                                <Button type="submit" size="icon" className="h-8 w-8 shrink-0">
                                    <Check className="w-4 h-4" />
                                </Button>
                            </form>
                        </PopoverContent>
                    </Popover>

                    <button
                        className={btnBase}
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        title="Вперёд"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        className={btnBase}
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(totalPages)}
                        title="Последняя"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </>

                /* ─── Режим 2: Полный — << < 1 2 3 ... > >> ─── */
            ) : (
                <>
                    <button
                        className={btnBase}
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(1)}
                        title="Первая"
                    >
                        <ChevronsLeft className="w-4 h-4" />
                    </button>
                    <button
                        className={btnBase}
                        disabled={currentPage === 1}
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        title="Назад"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    {getPageNumbers().map((page) => (
                        <button
                            key={page}
                            className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${page === currentPage ? 'font-semibold text-white' : 'hover:bg-gray-100'
                                }`}
                            style={page === currentPage ? { backgroundColor: 'var(--polka-accent)' } : {}}
                            onClick={() => onPageChange(page)}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        className={btnBase}
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        title="Вперёд"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                        className={btnBase}
                        disabled={currentPage === totalPages}
                        onClick={() => onPageChange(totalPages)}
                        title="Последняя"
                    >
                        <ChevronsRight className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
}
