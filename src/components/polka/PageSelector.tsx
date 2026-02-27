import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface PageSelectorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PageSelector({ currentPage, totalPages, onPageChange }: PageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchValue('');
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = (value: string) => {
    setSearchValue(value);
    const pageNum = parseInt(value);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setIsOpen(false);
      setSearchValue('');
    }
  };

  const getPageList = () => {
    const pages: number[] = [];
    
    // Добавляем первые страницы
    for (let i = 1; i <= Math.min(5, totalPages); i++) {
      pages.push(i);
    }
    
    // Добавляем десятки
    for (let i = 10; i <= totalPages; i += 10) {
      if (!pages.includes(i)) pages.push(i);
    }
    
    // Добавляем последнюю
    if (!pages.includes(totalPages)) pages.push(totalPages);
    
    return pages.sort((a, b) => a - b);
  };

  const filteredPages = searchValue
    ? getPageList().filter(p => p.toString().includes(searchValue))
    : getPageList();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="h-8 px-3 flex items-center gap-2 rounded border hover:bg-gray-50 transition-colors"
        style={{ borderColor: 'var(--polka-border)' }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-sm">
          {currentPage} из {totalPages}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border rounded-lg shadow-lg py-2 w-[200px] z-50"
          style={{ borderColor: 'var(--polka-border)' }}
        >
          {/* Search input */}
          <div className="px-3 pb-2 border-b" style={{ borderColor: 'var(--polka-border)' }}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Номер страницы..."
              className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2"
              style={{
                borderColor: 'var(--polka-border)',
                backgroundColor: 'var(--polka-bg-light)',
              }}
              value={searchValue}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchValue) {
                  handleSearch(searchValue);
                }
              }}
            />
          </div>

          {/* Page list */}
          <div className="max-h-[200px] overflow-y-auto">
            {filteredPages.map((page) => (
              <button
                key={page}
                className={`w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm flex items-center justify-between ${
                  page === currentPage ? 'bg-blue-50' : ''
                }`}
                onClick={() => {
                  onPageChange(page);
                  setIsOpen(false);
                  setSearchValue('');
                }}
              >
                <span>Страница {page}</span>
                {page === currentPage && <span className="text-xs">✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
