import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { CrashEvent, CrashContext } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
}

const CONTEXT_LABELS: Record<CrashContext, string> = {
  leading: 'Leading',
  chasing: 'Chasing',
  pack: 'In Pack',
};

const CONTEXT_COLORS: Record<CrashContext, string> = {
  leading: '#2646A7',
  chasing: '#DC2626',
  pack: '#D97706',
};

export default function CrashContextChart({ crashes }: Props) {
  const counts: Record<CrashContext, number> = { leading: 0, chasing: 0, pack: 0 };
  for (const c of crashes) {
    counts[c.context] = (counts[c.context] || 0) + 1;
  }

  const data = (Object.entries(counts) as [CrashContext, number][])
    .filter(([, v]) => v > 0)
    .map(([ctx, value]) => ({
      name: CONTEXT_LABELS[ctx],
      value,
      ctx,
    }));

  const total = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📍 Falls by Position Context</h2>
        <p className="text-gray-400 text-sm text-center py-8">No crash data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">📍 Falls by Position Context</h2>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={110}
              dataKey="value"
              label={({ name, value }: { name?: string; value?: number }) =>
                `${name ?? ''}: ${total > 0 && value != null ? ((value / total) * 100).toFixed(0) : 0}%`
              }
            >
              {data.map((d) => (
                <Cell key={d.ctx} fill={CONTEXT_COLORS[d.ctx]} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => [`${v} falls`, '']} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
