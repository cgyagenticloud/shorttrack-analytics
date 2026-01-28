import { useState, useRef, useEffect, useCallback } from 'react';
import type { Skater } from '../../types/data';
import { computeThreatLevel } from '../../lib/strategy';

interface Props {
  skaters: Skater[];
  onSelect: (skater: Skater) => void;
  placeholder?: string;
  excludeIds?: Set<string>;
}

const THREAT_COLORS: Record<string, string> = {
  high: 'text-red-600 bg-red-50',
  medium: 'text-amber-600 bg-amber-50',
  low: 'text-green-600 bg-green-50',
};

export default function SkaterSearch({
  skaters,
  onSelect,
  placeholder = 'Search skater by name...',
  excludeIds,
}: Props) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = query.trim().length >= 1
    ? skaters
        .filter((s) => {
          if (excludeIds?.has(s.id)) return false;
          const q = query.toLowerCase();
          return (
            s.name.toLowerCase().includes(q) ||
            s.nationality.toLowerCase().includes(q)
          );
        })
        .slice(0, 12)
    : [];

  const handleSelect = useCallback(
    (skater: Skater) => {
      onSelect(skater);
      setQuery('');
      setIsOpen(false);
      setHighlightIndex(0);
    },
    [onSelect]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen || filtered.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIndex((prev) => (prev + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[highlightIndex]) {
          handleSelect(filtered[highlightIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [isOpen, filtered, highlightIndex, handleSelect]
  );

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current && isOpen) {
      const item = listRef.current.children[highlightIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIndex, isOpen]);

  // Close dropdown on click outside
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      const target = e.target as Node;
      if (inputRef.current && !inputRef.current.parentElement?.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setHighlightIndex(0);
        }}
        onFocus={() => query.trim().length >= 1 && setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2646A7] focus:border-transparent bg-white placeholder-gray-400"
      />

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto"
        >
          {filtered.map((skater, idx) => {
            const threat = skater.stats.threat_score;
            const level = computeThreatLevel(threat);
            return (
              <li
                key={skater.id}
                className={`px-3 py-2 cursor-pointer flex items-center justify-between text-sm transition-colors ${
                  idx === highlightIndex
                    ? 'bg-blue-50 text-gray-900'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
                onMouseEnter={() => setHighlightIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(skater);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{skater.flag}</span>
                  <span className="font-medium truncate">{skater.name}</span>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {skater.nationality}
                  </span>
                </div>
                <span
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded ${THREAT_COLORS[level]}`}
                >
                  {Math.round(threat)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {isOpen && query.trim().length >= 1 && filtered.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm text-gray-400 text-center">
          No skaters found matching &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
