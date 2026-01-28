import { useState, useMemo } from 'react';
import type { Skater, Category } from '../types/data';
import SkaterCard from '../components/cards/SkaterCard';
import SkaterCompare from '../components/cards/SkaterCompare';
import MethodologyCard from '../components/cards/MethodologyCard';

interface Props {
  skaters: Skater[];
  category: Category | 'all';
}

export default function Scouting({ skaters, category }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Skater | null>(null);

  const filtered = useMemo(() => {
    return category === 'all' ? skaters : skaters.filter((s) => s.category === category);
  }, [skaters, category]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return filtered
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.nationality.toLowerCase().includes(q)
      )
      .slice(0, 12);
  }, [filtered, query]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">🔍 Scouting</h1>
        <p className="text-gray-500 mt-1">
          Look up any skater. Know their style, strengths, and weaknesses.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={selected ? `${selected.flag} ${selected.name}` : query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
          onFocus={() => {
            if (selected) {
              setSelected(null);
              setQuery('');
            }
          }}
          placeholder="Search by name or country..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#2646A7]/30 focus:border-[#2646A7] bg-white"
        />
        {selected && (
          <button
            onClick={() => {
              setSelected(null);
              setQuery('');
            }}
            className="absolute right-4 top-3 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}

        {/* Dropdown */}
        {!selected && results.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto">
            {results.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelected(s);
                  setQuery('');
                }}
                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100 last:border-0"
              >
                <div className="w-8 h-8 rounded-full bg-[#2646A7] text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {s.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900">
                    {s.flag} {s.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {s.nationality} · {s.gender} · {s.stats.total_races} races
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {!selected && query.trim() && results.length === 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg p-6 text-center text-gray-400 text-sm">
            No skaters found matching &ldquo;{query}&rdquo;
          </div>
        )}
      </div>

      {/* Selected Skater Card */}
      {selected && <SkaterCard skater={selected} />}

      {/* Placeholder when nothing selected */}
      {!selected && !query && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-gray-500 text-sm">
            Type a skater&apos;s name above to see their full profile
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {filtered.length} skaters available
          </p>
        </div>
      )}

      {/* Compare section */}
      <SkaterCompare skaters={filtered} />

      {/* Methodology */}
      <MethodologyCard
        title="Scouting — Metric Definitions"
        intro="Each skater profile is built from ISU World Tour and Junior World Cup race data. Stats aggregate all heats the skater participated in across the 2025-2026 season."
        metrics={[
          { term: 'Total Races', definition: 'Number of individual heat appearances across all events and distances.' },
          { term: 'Passes Made', definition: 'Total number of position gains (overtakes) across all races, detected via lap-by-lap position tracking.' },
          { term: 'Times Passed', definition: 'Total number of times the skater was overtaken by another competitor.' },
          { term: 'Net Passes', definition: 'Passes Made − Times Passed. Positive = net overtaker; Negative = frequently overtaken.' },
          { term: 'Avg Passes/Race', definition: 'Passes Made ÷ Total Races. Measures overtaking aggressiveness per race.' },
          { term: 'Style', definition: 'Categorized based on when overtakes occur: Late Mover (>50% in final laps), Front Runner (low pass count, high starting rank), Mid-Race Surge (majority mid-race), Balanced (even spread), No Passes.' },
          { term: 'Threat Score', definition: '0–100 composite reflecting pass rate, net passes, finals rate, and medal count. Used by the Strategy Optimizer to rank opponent danger.' },
          { term: 'Penalty Rate', definition: 'Penalties ÷ Total Races × 100%. Tracks disciplinary risk.' },
          { term: 'Clean Race %', definition: 'Races with no penalties, DNF, or DNS ÷ Total Races × 100%.' },
          { term: 'Crash Rate', definition: 'Inferred crashes ÷ Total Races × 100%. Crashes are detected via lap-time spike analysis (see Analytics page).' },
          { term: 'Medals', definition: 'Only Final A podium finishes (rank 1–3) count as medals: 🥇 Gold, 🥈 Silver, 🥉 Bronze.' },
        ]}
      />
    </div>
  );
}
