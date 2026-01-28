import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { CrashEvent } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
}

const PHASE_COLORS: Record<string, string> = {
  early: '#059669',
  middle: '#D97706',
  late: '#DC2626',
};

const PHASE_LABELS: Record<string, string> = {
  early: 'Early',
  middle: 'Middle',
  late: 'Late',
};

export default function CrashPhaseChart({ crashes }: Props) {
  const byPhase: Record<string, number> = { early: 0, middle: 0, late: 0 };
  for (const c of crashes) {
    byPhase[c.phase] = (byPhase[c.phase] || 0) + 1;
  }

  const data = ['early', 'middle', 'late'].map((p) => ({
    phase: PHASE_LABELS[p],
    key: p,
    count: byPhase[p] || 0,
    pct: crashes.length > 0 ? ((byPhase[p] || 0) / crashes.length * 100).toFixed(1) : '0',
  }));

  if (crashes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🕐 Falls by Race Phase</h2>
        <p className="text-gray-400 text-sm text-center py-8">No crash data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">🕐 Falls by Race Phase</h2>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="phase" tick={{ fontSize: 13, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v) => [`${v} falls`, '']}
              labelFormatter={(l) => `${l} Phase`}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.key} fill={PHASE_COLORS[d.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Early: Laps 1-3 · Middle: Laps 4-6 · Late: Final laps
      </p>
    </div>
  );
}
