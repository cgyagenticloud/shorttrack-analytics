import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { CrashEvent } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
}

export default function CrashLapHeatmap({ crashes }: Props) {
  // Count crashes per lap number (relative: lap / total_laps)
  // Group by actual lap number for simplicity
  const byLap: Record<number, number> = {};
  for (const c of crashes) {
    byLap[c.crash_lap] = (byLap[c.crash_lap] || 0) + 1;
  }

  const maxLap = Math.max(...Object.keys(byLap).map(Number), 0);
  const data = [];
  for (let lap = 1; lap <= Math.min(maxLap, 30); lap++) {
    if (byLap[lap]) {
      data.push({ lap: `Lap ${lap}`, count: byLap[lap] });
    }
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔥 Falls by Lap Number</h2>
        <p className="text-gray-400 text-sm text-center py-8">No data available</p>
      </div>
    );
  }

  // Find the peak lap
  const peakLap = data.reduce((a, b) => (b.count > a.count ? b : a));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">🔥 Falls by Lap Number</h2>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="lap" tick={{ fontSize: 11, fontWeight: 600 }} interval={0} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v} falls`, 'Count']} />
            <Bar dataKey="count" fill="#DC2626" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Peak: {peakLap.lap} ({peakLap.count} falls) — Final laps see the most action
      </p>
    </div>
  );
}
