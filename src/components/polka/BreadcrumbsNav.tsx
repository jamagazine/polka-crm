import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router';

interface BreadcrumbSegment {
  label: string;
  alternatives?: { label: string; href: string }[];
}

interface BreadcrumbsNavProps {
  segments: BreadcrumbSegment[];
}

export function BreadcrumbsNav({ segments }: BreadcrumbsNavProps) {
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 relative" ref={dropdownRef}>
      {segments.map((segment, idx) => (
        <div key={idx} className="flex items-center gap-2">
          {idx > 0 && <span className="text-gray-400">›</span>}

          <div className="relative">
            <button
              className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100 transition-colors group"
              onClick={() => setOpenDropdown(openDropdown === idx ? null : idx)}
            >
              <span className="font-medium">{segment.label}</span>
              {segment.alternatives && segment.alternatives.length > 0 && (
                <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600" />
              )}
            </button>

            {/* Dropdown menu */}
            {openDropdown === idx && segment.alternatives && segment.alternatives.length > 0 && (
              <div
                className="absolute top-full left-0 mt-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-50"
                style={{ borderColor: 'var(--polka-border)' }}
              >
                {segment.alternatives.map((alt, altIdx) => (
                  <button
                    key={altIdx}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors text-sm flex items-center justify-between"
                    onClick={() => {
                      navigate(alt.href);
                      setOpenDropdown(null);
                    }}
                  >
                    <span>{alt.label}</span>
                    {alt.label === segment.label && (
                      <span className="text-xs">✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
