import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { CrashEvent, Heat } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
  heats: Heat[];
}

export default function CrashDistanceChart({ crashes, heats }: Props) {
  // Count crashes per distance
  const crashByDist: Record<number, number> = {};
  for (const c of crashes) {
    crashByDist[c.distance] = (crashByDist[c.distance] || 0) + 1;
  }

  // Count unique heats per distance for rate calculation
  const heatsByDist: Record<number, Set<string>> = {};
  for (const h of heats) {
    if (!heatsByDist[h.distance]) heatsByDist[h.distance] = new Set();
    heatsByDist[h.distance].add(h.heat_id);
  }

  const data = [500, 1000, 1500]
    .filter((d) => crashByDist[d] || heatsByDist[d])
    .map((d) => {
      const totalCrashes = crashByDist[d] || 0;
      const uniqueHeats = heatsByDist[d]?.size || 0;
      return {
        distance: `${d}m`,
        crashes: totalCrashes,
        rate: uniqueHeats > 0 ? +(totalCrashes / uniqueHeats * 100).toFixed(1) : 0,
      };
    });

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📏 Falls by Distance</h2>
        <p className="text-gray-400 text-sm text-center py-8">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">📏 Falls by Distance</h2>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="distance" tick={{ fontSize: 13, fontWeight: 600 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} unit="%" />
            <Tooltip
              formatter={(v, name) => [
                name === 'crashes' ? `${v} falls` : `${v}%`,
                name === 'crashes' ? 'Falls' : 'Fall Rate (per heat)',
              ]}
            />
            <Bar yAxisId="left" dataKey="crashes" fill="#DC2626" radius={[6, 6, 0, 0]} name="crashes" />
            <Bar yAxisId="right" dataKey="rate" fill="#F59E0B" radius={[6, 6, 0, 0]} name="rate" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        Red = total falls · Yellow = fall rate per heat (%)
      </p>
    </div>
  );
}
