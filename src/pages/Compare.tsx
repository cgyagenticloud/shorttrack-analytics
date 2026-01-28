import { useState, useMemo } from 'react';
import type { Skater, Category, Style } from '../types/data';
import { STYLE_LABELS } from '../types/data';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

interface Props {
  skaters: Skater[];
  category: Category | 'all';
}

const COLORS = ['#2646A7', '#E63946', '#2A9D8F'];

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

function SkaterSelector({
  skaters,
  selected,
  onSelect,
  label,
  color,
}: {
  skaters: Skater[];
  selected: Skater | null;
  onSelect: (s: Skater | null) => void;
  label: string;
  color: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return skaters.filter((s) => s.name.toLowerCase().includes(q) || s.nationality.toLowerCase().includes(q)).slice(0, 10);
  }, [skaters, query]);

  return (
    <div className="relative flex-1 min-w-[200px]">
      <label className="text-xs font-semibold uppercase flex items-center gap-2" style={{ color }}>
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </label>
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
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search skater..."
        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
        style={{ ['--tw-ring-color' as string]: color }}
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

function InfoCard({ skater, color }: { skater: Skater; color: string }) {
  return (
    <div className="bg-white rounded-xl border-2 p-4 flex-1 min-w-[200px]" style={{ borderColor: color }}>
      <div className="flex items-center gap-3 mb-3">
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: color }}
        >
          {skater.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{skater.flag} {skater.name}</h3>
          <p className="text-sm text-gray-500">{skater.nationality}</p>
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Club</span>
          <span className="font-semibold text-gray-900">{skater.club || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Age</span>
          <span className="font-semibold text-gray-900">{skater.age || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Gender</span>
          <span className="font-semibold text-gray-900">{skater.gender}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-500">Style</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${STYLE_COLORS[skater.stats.style]}`}>
            {STYLE_LABELS[skater.stats.style]}
          </span>
        </div>
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between">
            <span className="text-gray-500">🥇</span>
            <span className="font-bold text-amber-500">{skater.stats.medals.gold}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">🥈</span>
            <span className="font-bold text-gray-400">{skater.stats.medals.silver}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">🥉</span>
            <span className="font-bold text-amber-700">{skater.stats.medals.bronze}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-gray-100 mt-1">
            <span className="text-gray-500 font-semibold">Total Medals</span>
            <span className="font-bold text-gray-900">{skater.stats.medals.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Compare({ skaters, category }: Props) {
  const [selectedSkaters, setSelectedSkaters] = useState<(Skater | null)[]>([null, null, null]);

  const filtered = useMemo(() => {
    return category === 'all' ? skaters : skaters.filter((s) => s.category === category);
  }, [skaters, category]);

  const activeSkaters = selectedSkaters.filter((s): s is Skater => s !== null);
  const hasComparison = activeSkaters.length >= 2;

  // Stats for bar chart
  const statsData = useMemo(() => {
    if (!hasComparison) return [];
    return [
      { name: 'Races', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, s.stats.total_races])) },
      { name: 'Passes Made', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, s.stats.total_passes_made])) },
      { name: 'Net Passes', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, s.stats.net_passes])) },
      { name: 'Finals', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, s.stats.finals_appearances])) },
      { name: 'Total Medals', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, s.stats.medals.total])) },
    ];
  }, [activeSkaters, hasComparison]);

  // Radar chart data (normalized 0-100)
  const radarData = useMemo(() => {
    if (!hasComparison) return [];
    const maxThreat = Math.max(...activeSkaters.map(s => s.stats.threat_score), 1);
    const maxRaces = Math.max(...activeSkaters.map(s => s.stats.total_races), 1);
    const maxPasses = Math.max(...activeSkaters.map(s => s.stats.avg_passes_per_race), 1);
    const maxMedals = Math.max(...activeSkaters.map(s => s.stats.medals.total), 1);
    const maxFinals = Math.max(...activeSkaters.map(s => s.stats.finals_appearances), 1);

    return [
      { metric: 'Threat Score', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, (s.stats.threat_score / maxThreat) * 100])) },
      { metric: 'Experience', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, (s.stats.total_races / maxRaces) * 100])) },
      { metric: 'Aggressiveness', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, (s.stats.avg_passes_per_race / maxPasses) * 100])) },
      { metric: 'Medals', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, (s.stats.medals.total / maxMedals) * 100])) },
      { metric: 'Finals Rate', ...Object.fromEntries(activeSkaters.map((s, i) => [`skater${i}`, (s.stats.finals_appearances / maxFinals) * 100])) },
    ];
  }, [activeSkaters, hasComparison]);

  // PB comparison data
  const pbData = useMemo(() => {
    if (!hasComparison) return [];
    const distances = ['500', '1000', '1500'];
    return distances.map(dist => {
      const row: Record<string, string | number | null> = { distance: `${dist}m` };
      activeSkaters.forEach((s, i) => {
        const pb = s.personal_bests?.[dist];
        row[`skater${i}`] = pb || null;
        row[`skater${i}_sec`] = parseTimeToSeconds(pb);
      });
      return row;
    });
  }, [activeSkaters, hasComparison]);

  const setSkater = (index: number, skater: Skater | null) => {
    setSelectedSkaters(prev => {
      const next = [...prev];
      next[index] = skater;
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">⚔️ Compare Skaters</h1>
        <p className="text-gray-500 mt-1">
          Select 2-3 skaters to compare their stats, personal bests, and performance side by side.
        </p>
      </div>

      {/* Skater Selectors */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex flex-wrap gap-4">
          <SkaterSelector
            skaters={filtered}
            selected={selectedSkaters[0]}
            onSelect={(s) => setSkater(0, s)}
            label="Skater 1"
            color={COLORS[0]}
          />
          <SkaterSelector
            skaters={filtered}
            selected={selectedSkaters[1]}
            onSelect={(s) => setSkater(1, s)}
            label="Skater 2"
            color={COLORS[1]}
          />
          <SkaterSelector
            skaters={filtered}
            selected={selectedSkaters[2]}
            onSelect={(s) => setSkater(2, s)}
            label="Skater 3 (optional)"
            color={COLORS[2]}
          />
        </div>
        {activeSkaters.length < 2 && (
          <p className="text-sm text-gray-400 mt-4 text-center">
            Select at least 2 skaters to start comparing
          </p>
        )}
      </div>

      {/* Info Cards */}
      {hasComparison && (
        <div className="flex flex-wrap gap-4">
          {activeSkaters.map((skater, i) => (
            <InfoCard key={skater.id} skater={skater} color={COLORS[i]} />
          ))}
        </div>
      )}

      {/* Personal Bests Table */}
      {hasComparison && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">⏱️ Personal Bests</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Distance</th>
                  {activeSkaters.map((s, i) => (
                    <th key={s.id} className="text-center py-2 px-3 font-semibold" style={{ color: COLORS[i] }}>
                      {s.flag} {s.name.split(' ').pop()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pbData.map((row) => {
                  // Find best time
                  const times = activeSkaters.map((_, i) => row[`skater${i}_sec`] as number | null);
                  const validTimes = times.filter((t): t is number => t !== null);
                  const bestTime = validTimes.length > 0 ? Math.min(...validTimes) : null;

                  return (
                    <tr key={row.distance as string} className="border-b border-gray-100">
                      <td className="py-3 px-3 font-semibold text-gray-700">{row.distance}</td>
                      {activeSkaters.map((_, i) => {
                        const time = row[`skater${i}`] as string | null;
                        const timeSec = row[`skater${i}_sec`] as number | null;
                        const isBest = timeSec !== null && timeSec === bestTime;
                        return (
                          <td
                            key={i}
                            className={`py-3 px-3 text-center font-semibold ${isBest ? 'text-green-600' : 'text-gray-700'}`}
                          >
                            {time || '—'}
                            {isBest && time && ' ✓'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      {hasComparison && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Stats Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={statsData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend
                  formatter={(value) => {
                    const idx = parseInt(value.replace('skater', ''));
                    return activeSkaters[idx]?.name.split(' ').pop() || value;
                  }}
                />
                {activeSkaters.map((_, i) => (
                  <Bar key={i} dataKey={`skater${i}`} fill={COLORS[i]} name={`skater${i}`} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Radar Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🎯 Performance Profile</h2>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                {activeSkaters.map((s, i) => (
                  <Radar
                    key={s.id}
                    name={s.name.split(' ').pop() || s.name}
                    dataKey={`skater${i}`}
                    stroke={COLORS[i]}
                    fill={COLORS[i]}
                    fillOpacity={0.2}
                  />
                ))}
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Detailed Stats Table */}
      {hasComparison && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">📋 Detailed Stats</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-500 font-semibold">Metric</th>
                  {activeSkaters.map((s, i) => (
                    <th key={s.id} className="text-center py-2 px-3 font-semibold" style={{ color: COLORS[i] }}>
                      {s.flag} {s.name.split(' ').pop()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Total Races', key: 'total_races', higherBetter: true },
                  { label: 'Competitions', key: 'competitions_entered', higherBetter: true },
                  { label: 'Passes Made', key: 'total_passes_made', higherBetter: true },
                  { label: 'Times Passed', key: 'total_times_passed', higherBetter: false },
                  { label: 'Net Passes', key: 'net_passes', higherBetter: true },
                  { label: 'Avg Passes/Race', key: 'avg_passes_per_race', higherBetter: true },
                  { label: 'Finals Appearances', key: 'finals_appearances', higherBetter: true },
                  { label: 'Threat Score', key: 'threat_score', higherBetter: true },
                  { label: 'Penalty Rate %', key: 'penalty_rate', higherBetter: false },
                  { label: 'Clean Race %', key: 'clean_race_pct', higherBetter: true },
                ].map((metric) => {
                  const values = activeSkaters.map(s => {
                    const val = s.stats[metric.key as keyof typeof s.stats];
                    return typeof val === 'number' ? val : 0;
                  });
                  const best = metric.higherBetter ? Math.max(...values) : Math.min(...values);

                  return (
                    <tr key={metric.key} className="border-b border-gray-100">
                      <td className="py-3 px-3 text-gray-600">{metric.label}</td>
                      {activeSkaters.map((s, i) => {
                        const val = s.stats[metric.key as keyof typeof s.stats];
                        const numVal = typeof val === 'number' ? val : 0;
                        const isBest = numVal === best && values.filter(v => v === best).length === 1;
                        const display = typeof val === 'number'
                          ? (Number.isInteger(val) ? val : val.toFixed(2))
                          : '—';
                        return (
                          <td
                            key={i}
                            className={`py-3 px-3 text-center font-semibold ${isBest ? 'text-green-600' : 'text-gray-700'}`}
                          >
                            {display}
                            {isBest && ' ✓'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasComparison && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="text-5xl mb-4">⚔️</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Ready to Compare</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            Select at least two skaters above to see their stats, personal bests, and performance visualizations side by side.
          </p>
          <p className="text-gray-400 text-xs mt-4">
            {filtered.length} skaters available in the selected category
          </p>
        </div>
      )}
    </div>
  );
}
