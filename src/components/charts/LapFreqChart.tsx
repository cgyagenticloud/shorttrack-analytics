import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import type { PassEvent } from '../../types/data';

interface Props {
  passes: PassEvent[];
}

const COLORS: Record<number, string> = {
  500: '#0891B2',
  1000: '#2646A7',
  1500: '#7C3AED',
};

export default function LapFreqChart({ passes }: Props) {
  // Group by distance → lap → count
  const distanceLaps: Record<number, Record<number, number>> = {};
  const distances = new Set<number>();

  for (const p of passes) {
    distances.add(p.distance);
    if (!distanceLaps[p.distance]) distanceLaps[p.distance] = {};
    distanceLaps[p.distance][p.lap] = (distanceLaps[p.distance][p.lap] || 0) + 1;
  }

  // Find max lap across all distances
  let maxLap = 0;
  for (const dist of Object.values(distanceLaps)) {
    for (const lap of Object.keys(dist)) {
      maxLap = Math.max(maxLap, Number(lap));
    }
  }

  // Build data array: one entry per lap
  const data = [];
  for (let lap = 1; lap <= maxLap; lap++) {
    const row: Record<string, number> = { lap };
    for (const d of distances) {
      row[`${d}m`] = distanceLaps[d]?.[lap] || 0;
    }
    data.push(row);
  }

  const sortedDistances = [...distances].sort((a, b) => a - b);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Overtakes by Lap Number
      </h2>
      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="lap"
              tick={{ fontSize: 12 }}
              label={{ value: 'Lap', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {sortedDistances.map((d) => (
              <Line
                key={d}
                type="monotone"
                dataKey={`${d}m`}
                name={`${d}m`}
                stroke={COLORS[d] || '#64748B'}
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
