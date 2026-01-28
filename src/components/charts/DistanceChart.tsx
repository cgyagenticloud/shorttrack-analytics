import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { PassEvent } from '../../types/data';

interface Props {
  passes: PassEvent[];
}

export default function DistanceChart({ passes }: Props) {
  const byDist: Record<number, number> = {};
  for (const p of passes) {
    byDist[p.distance] = (byDist[p.distance] || 0) + 1;
  }

  const data = [500, 1000, 1500]
    .filter((d) => byDist[d])
    .map((d) => ({
      distance: `${d}m`,
      overtakes: byDist[d] || 0,
    }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Overtakes by Distance
      </h2>
      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="distance" tick={{ fontSize: 13, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Overtakes']} />
            <Bar dataKey="overtakes" fill="#2646A7" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
