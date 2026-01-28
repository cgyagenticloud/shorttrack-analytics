import { useState, useMemo } from 'react';
import type { Skater, Style } from '../../types/data';
import { STYLE_LABELS } from '../../types/data';

interface Props {
  skaters: Skater[];
}

const STYLE_COLORS: Record<Style, string> = {
  late_mover: 'bg-red-50 text-red-800 border-red-200',
  front_runner: 'bg-green-50 text-green-800 border-green-200',
  mid_surge: 'bg-amber-50 text-amber-800 border-amber-200',
  balanced: 'bg-blue-50 text-blue-800 border-blue-200',
  no_passes: 'bg-gray-100 text-gray-600 border-gray-200',
  developing: 'bg-purple-50 text-purple-800 border-purple-200',
  sprint: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  unknown: 'bg-gray-100 text-gray-500 border-gray-200',
};

interface StatRow {
  label: string;
  a: number;
  b: number;
  higherIsBetter: boolean;
}

interface TimeRow {
  label: string;
  a: string | null;
  b: string | null;
}

function parseTimeToSeconds(t: string | undefined | null): number | null {
  if (!t) return null;
  const s = t.trim();
  if (s.includes(':')) {
    const [mins, secs] = s.split(':');
    return parseFloat(mins) * 60 + parseFloat(secs);
  }
  const v = parseFloat(s);
  return isNaN(v) ? null : v;
}

function CompareTimeRow({ label, a, b }: TimeRow) {
  const aSec = parseTimeToSeconds(a);
  const bSec = parseTimeToSeconds(b);
  const aWins = aSec !== null && bSec !== null && aSec < bSec;
  const bWins = aSec !== null && bSec !== null && bSec < aSec;

  return (
    <div className="grid grid-cols-3 items-center text-sm py-2 border-b border-gray-100">
      <div className={`text-right pr-4 font-semibold ${aWins ? 'text-green-700' : 'text-gray-700'}`}>
        {a ?? '—'}
        {aWins && ' ✓'}
      </div>
      <div className="text-center text-xs font-semibold text-gray-500 uppercase">{label}</div>
      <div className={`text-left pl-4 font-semibold ${bWins ? 'text-green-700' : 'text-gray-700'}`}>
        {bWins && '✓ '}
        {b ?? '—'}
      </div>
    </div>
  );
}

function SearchBox({
  skaters,
  selected,
  onSelect,
  label,
}: {
  skaters: Skater[];
  selected: Skater | null;
  onSelect: (s: Skater | null) => void;
  label: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return skaters.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 10);
  }, [skaters, query]);

  return (
    <div className="relative">
      <label className="text-xs font-semibold text-gray-500 uppercase">{label}</label>
      <input
        type="text"
        value={selected ? `${selected.flag} ${selected.name}` : query}
        onChange={(e) => {
          setQuery(e.target.value);
          onSelect(null);
          setOpen(true);
        }}
        onFocus={() => {
          if (!selected) setOpen(true);
        }}
        placeholder="Search skater..."
        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2646A7]/30 focus:border-[#2646A7]"
      />
      {selected && (
        <button
          onClick={() => {
            onSelect(null);
            setQuery('');
          }}
          className="absolute right-2 top-7 text-gray-400 hover:text-gray-600 text-sm"
        >
          ✕
        </button>
      )}
      {open && !selected && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {results.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                onSelect(s);
                setQuery('');
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
            >
              <span>{s.flag}</span>
              <span className="font-semibold">{s.name}</span>
              <span className="text-gray-400 text-xs">{s.nationality}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompareRow({ label, a, b, higherIsBetter }: StatRow) {
  const aWins = higherIsBetter ? a > b : a < b;
  const bWins = higherIsBetter ? b > a : b < a;

  return (
    <div className="grid grid-cols-3 items-center text-sm py-2 border-b border-gray-100">
      <div className={`text-right pr-4 font-semibold ${aWins ? 'text-green-700' : 'text-gray-700'}`}>
        {typeof a === 'number' && !Number.isInteger(a) ? a.toFixed(2) : a}
        {aWins && ' ✓'}
      </div>
      <div className="text-center text-xs font-semibold text-gray-500 uppercase">{label}</div>
      <div className={`text-left pl-4 font-semibold ${bWins ? 'text-green-700' : 'text-gray-700'}`}>
        {bWins && '✓ '}
        {typeof b === 'number' && !Number.isInteger(b) ? b.toFixed(2) : b}
      </div>
    </div>
  );
}

export default function SkaterCompare({ skaters }: Props) {
  const [skaterA, setSkaterA] = useState<Skater | null>(null);
  const [skaterB, setSkaterB] = useState<Skater | null>(null);

  const stats: StatRow[] =
    skaterA && skaterB
      ? [
          { label: 'Races', a: skaterA.stats.total_races, b: skaterB.stats.total_races, higherIsBetter: true },
          { label: 'Passes Made', a: skaterA.stats.total_passes_made, b: skaterB.stats.total_passes_made, higherIsBetter: true },
          { label: 'Times Passed', a: skaterA.stats.total_times_passed, b: skaterB.stats.total_times_passed, higherIsBetter: false },
          { label: 'Net Passes', a: skaterA.stats.net_passes, b: skaterB.stats.net_passes, higherIsBetter: true },
          { label: 'Avg / Race', a: skaterA.stats.avg_passes_per_race, b: skaterB.stats.avg_passes_per_race, higherIsBetter: true },
          { label: 'Early', a: skaterA.stats.passes_early, b: skaterB.stats.passes_early, higherIsBetter: true },
          { label: 'Middle', a: skaterA.stats.passes_middle, b: skaterB.stats.passes_middle, higherIsBetter: true },
          { label: 'Late', a: skaterA.stats.passes_late, b: skaterB.stats.passes_late, higherIsBetter: true },
          { label: 'Finals', a: skaterA.stats.finals_appearances, b: skaterB.stats.finals_appearances, higherIsBetter: true },
          { label: 'Threat Score', a: skaterA.stats.threat_score, b: skaterB.stats.threat_score, higherIsBetter: true },
        ]
      : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">⚔️ Compare Skaters</h2>
      <p className="text-sm text-gray-500">Pick two skaters and see who's stronger in each stat.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SearchBox skaters={skaters} selected={skaterA} onSelect={setSkaterA} label="Skater A" />
        <SearchBox skaters={skaters} selected={skaterB} onSelect={setSkaterB} label="Skater B" />
      </div>

      {skaterA && skaterB && (
        <div className="mt-4">
          {/* Header row */}
          <div className="grid grid-cols-3 items-center mb-3">
            <div className="text-right pr-4">
              <span className="font-extrabold text-gray-900">{skaterA.flag} {skaterA.name}</span>
              <div className="mt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STYLE_COLORS[skaterA.stats.style]}`}>
                  {STYLE_LABELS[skaterA.stats.style]}
                </span>
              </div>
            </div>
            <div className="text-center text-xs font-bold text-gray-400">VS</div>
            <div className="text-left pl-4">
              <span className="font-extrabold text-gray-900">{skaterB.flag} {skaterB.name}</span>
              <div className="mt-1">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STYLE_COLORS[skaterB.stats.style]}`}>
                  {STYLE_LABELS[skaterB.stats.style]}
                </span>
              </div>
            </div>
          </div>

          {/* Stats rows */}
          {stats.map((row) => (
            <CompareRow key={row.label} {...row} />
          ))}

          {/* Personal Bests section */}
          <div className="mt-3 mb-1">
            <div className="grid grid-cols-3 items-center">
              <div />
              <div className="text-center text-xs font-bold text-[#2646A7] uppercase tracking-wider py-2">
                ⏱️ Personal Bests
              </div>
              <div />
            </div>
          </div>
          <CompareTimeRow
            label="500m PB"
            a={skaterA.personal_bests?.['500'] ?? null}
            b={skaterB.personal_bests?.['500'] ?? null}
          />
          <CompareTimeRow
            label="1000m PB"
            a={skaterA.personal_bests?.['1000'] ?? null}
            b={skaterB.personal_bests?.['1000'] ?? null}
          />
          <CompareTimeRow
            label="1500m PB"
            a={skaterA.personal_bests?.['1500'] ?? null}
            b={skaterB.personal_bests?.['1500'] ?? null}
          />
        </div>
      )}

      {(!skaterA || !skaterB) && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Select two skaters above to compare their stats
        </div>
      )}
    </div>
  );
}
