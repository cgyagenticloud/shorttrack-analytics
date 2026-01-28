import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from 'recharts';
import type { Skater } from '../../types/data';

interface Props {
  skaters: Skater[];
}

export default function TopOvertakersChart({ skaters }: Props) {
  const data = [...skaters]
    .sort((a, b) => b.stats.total_passes_made - a.stats.total_passes_made)
    .slice(0, 20)
    .map((s) => ({
      name: `${s.flag} ${s.name}`,
      passesMade: s.stats.total_passes_made,
      timesPassed: s.stats.total_times_passed,
    }))
    .reverse(); // bottom-to-top order for vertical layout

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Top 20 Overtakers
      </h2>
      <div style={{ height: 600 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 140, right: 20, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              width={130}
            />
            <Tooltip />
            <Legend />
            <Bar dataKey="passesMade" name="Passes Made" fill="#2646A7" radius={[0, 4, 4, 0]} />
            <Bar dataKey="timesPassed" name="Times Passed" fill="#DC2626" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
