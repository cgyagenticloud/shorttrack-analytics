import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { PassEvent } from '../../types/data';

interface Props {
  passes: PassEvent[];
}

const COLORS: Record<string, string> = {
  Early: '#0891B2',
  Middle: '#D97706',
  Late: '#DC2626',
};

export default function TimingChart({ passes }: Props) {
  const counts = { Early: 0, Middle: 0, Late: 0 };
  for (const p of passes) {
    if (p.stage === 'early') counts.Early++;
    else if (p.stage === 'middle') counts.Middle++;
    else if (p.stage === 'late') counts.Late++;
  }

  const data = Object.entries(counts).map(([name, value]) => ({ name, value }));
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        When Do Overtakes Happen?
      </h2>
      <div style={{ height: 350 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={120}
              dataKey="value"
              label={({ name, value }) =>
                `${name}: ${((value / total) * 100).toFixed(0)}%`
              }
            >
              {data.map((d) => (
                <Cell key={d.name} fill={COLORS[d.name]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [Number(v).toLocaleString(), 'Overtakes']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
