import { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { Skater, Category } from '../types/data';
import MethodologyCard from '../components/cards/MethodologyCard';

interface Props {
  skaters: Skater[];
  category: Category | 'all';
}

const CHART_COLORS = {
  blue: '#2646A7',
  cyan: '#0891B2',
  purple: '#7C3AED',
  gold: '#D97706',
  green: '#059669',
  red: '#DC2626',
  pink: '#DB2777',
  orange: '#EA580C',
  slate: '#64748B',
};

export default function Progress({ skaters, category }: Props) {
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

  // Computed stats for selected skater
  const seasonKPIs = useMemo(() => {
    if (!selected) return null;
    const s = selected;
    const bestFinish = s.events.reduce<number | null>((best, ev) => {
      if (ev.best_rank === null) return best;
      if (best === null) return ev.best_rank;
      return Math.min(best, ev.best_rank);
    }, null);
    const finalsReached = s.events.filter((ev) => ev.finals_reached).length;
    const medalsWon =
      s.stats.medals.gold + s.stats.medals.silver + s.stats.medals.bronze;
    return {
      totalRaces: s.stats.total_races,
      totalPasses: s.stats.total_passes_made,
      netPasses: s.stats.net_passes,
      bestFinish: bestFinish ?? '—',
      finalsReached,
      medalsWon,
    };
  }, [selected]);

  const progressData = useMemo(() => {
    if (!selected) return [];
    return selected.events.map((ev, i) => ({
      index: i + 1,
      event: ev.name.length > 18 ? ev.name.slice(0, 18) + '…' : ev.name,
      points: ev.races,
    }));
  }, [selected]);

  const overtakeStyleData = useMemo(() => {
    if (!selected) return [];
    const s = selected.stats;
    return [
      { name: 'Early', value: s.passes_early, fill: CHART_COLORS.blue },
      { name: 'Middle', value: s.passes_middle, fill: CHART_COLORS.gold },
      { name: 'Late', value: s.passes_late, fill: CHART_COLORS.red },
    ];
  }, [selected]);

  const distanceData = useMemo(() => {
    if (!selected) return [];
    return selected.distances.map((d) => ({
      distance: `${d.distance}m`,
      races: d.races,
      passes: 0,  // pass data not available at distance level
    }));
  }, [selected]);

  const medalEmoji = (medal: string | null) => {
    if (!medal) return '—';
    const lower = medal.toLowerCase();
    if (lower === 'gold') return '🥇';
    if (lower === 'silver') return '🥈';
    if (lower === 'bronze') return '🥉';
    return medal;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">📈 My Progress</h1>
        <p className="text-gray-500 mt-1">
          Track your improvement over the season, event by event.
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

      {/* Placeholder when nothing selected */}
      {!selected && !query && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-3">📈</div>
          <p className="text-gray-500 text-sm">
            Type a skater&apos;s name above to track their season progress
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {filtered.length} skaters available
          </p>
        </div>
      )}

      {/* Selected Skater Data */}
      {selected && seasonKPIs && (
        <>
          {/* Season Overview KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
              <div className="text-[2rem] font-extrabold text-[#2646A7] leading-tight">
                {seasonKPIs.totalRaces}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Total Races
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
              <div className="text-[2rem] font-extrabold text-[#2646A7] leading-tight">
                {seasonKPIs.totalPasses}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Total Passes
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
              <div className={`text-[2rem] font-extrabold leading-tight ${seasonKPIs.netPasses >= 0 ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                {seasonKPIs.netPasses > 0 ? '+' : ''}
                {seasonKPIs.netPasses}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Net Passes
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
              <div className="text-[2rem] font-extrabold text-[#2646A7] leading-tight">
                {seasonKPIs.bestFinish}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Best Finish
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
              <div className="text-[2rem] font-extrabold text-[#2646A7] leading-tight">
                {seasonKPIs.finalsReached}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Finals Reached
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
              <div className="text-[2rem] font-extrabold text-[#D97706] leading-tight">
                {seasonKPIs.medalsWon}
              </div>
              <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
                Medals Won
              </div>
            </div>
          </div>

          {/* Event-by-Event Table */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Event-by-Event Breakdown
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-600">Event</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Races</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Best Rank</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Finals</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Medal</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-600">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.events.map((ev, i) => (
                    <tr
                      key={ev.event_id + '-' + i}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                    >
                      <td className="py-3 px-2 font-medium text-gray-900">
                        {ev.name}
                      </td>
                      <td className="py-3 px-2 text-center text-gray-700">
                        {ev.races}
                      </td>
                      <td className="py-3 px-2 text-center text-gray-700">
                        {ev.best_rank ?? '—'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {ev.finals_reached ? '✅' : '❌'}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {medalEmoji(ev.medal)}
                      </td>
                      <td className="py-3 px-2 text-center font-semibold text-[#2646A7]">
                        {ev.races}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Progress Chart */}
          {progressData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Points Progress Over Events
              </h2>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={progressData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="index"
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Event #', position: 'insideBottom', offset: -5, fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(v) => {
                        const item = progressData.find((d) => d.index === v);
                        return item ? item.event : `Event ${v}`;
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="points"
                      name="Points"
                      stroke={CHART_COLORS.blue}
                      strokeWidth={3}
                      dot={{ r: 5, fill: CHART_COLORS.blue }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Overtake Style + Distance Performance (2-column) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Overtake Style Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Overtake Timing Style
              </h2>
              {overtakeStyleData.every((d) => d.value === 0) ? (
                <p className="text-gray-400 text-sm text-center py-8">No overtake data available</p>
              ) : (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overtakeStyleData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                      >
                        {overtakeStyleData.map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => [value ?? 0, 'Passes']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Distance Performance */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Distance Performance
              </h2>
              {distanceData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">No distance data available</p>
              ) : (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={distanceData} margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="distance" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="races" name="Races" fill={CHART_COLORS.blue} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="passes" name="Passes Made" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Methodology */}
      <MethodologyCard
        title="My Progress — Metric Definitions"
        intro="Track a skater's season trajectory across ISU events. All metrics are aggregated from official race results for the 2025-2026 season."
        metrics={[
          { term: 'Total Races', definition: 'Sum of all heat appearances across every event the skater entered.' },
          { term: 'Total Passes', definition: 'Cumulative overtakes made across the entire season.' },
          { term: 'Net Passes', definition: 'Passes Made − Times Passed. A key indicator of competitive improvement over time.' },
          { term: 'Best Finish', definition: 'The highest (lowest number) rank achieved in any single heat across all events.' },
          { term: 'Finals Reached', definition: 'Number of events where the skater advanced to a Final A or Final B heat.' },
          { term: 'Medals Won', definition: 'Total Final A podium finishes (rank 1–3) across the season.' },
          { term: 'Points Progress', definition: 'ISU ranking points earned at each event, plotted chronologically to show performance trend.' },
          { term: 'Overtake Timing Style', definition: 'Pie chart showing the proportion of overtakes in Early (laps 1–3), Middle (laps 4–6), and Late (final laps) race phases.' },
          { term: 'Distance Performance', definition: 'Races entered and passes made broken down by distance (500m, 1000m, 1500m). Reveals distance specialization.' },
        ]}
      />
    </div>
  );
}
