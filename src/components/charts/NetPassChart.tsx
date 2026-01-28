import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from 'recharts';
import type { Skater } from '../../types/data';

interface Props {
  skaters: Skater[];
}

export default function NetPassChart({ skaters }: Props) {
  const sorted = [...skaters].sort((a, b) => b.stats.net_passes - a.stats.net_passes);

  const top10 = sorted.slice(0, 10);
  const bottom10 = sorted.slice(-10).reverse();

  // Combine: top 10, then bottom 10
  const combined = [...top10, ...bottom10];
  // Remove duplicates (in case fewer than 20 skaters)
  const seen = new Set<string>();
  const data = combined
    .filter((s) => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .map((s) => ({
      name: `${s.flag} ${s.name}`,
      net: s.stats.net_passes,
    }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">
        Best &amp; Worst Net Passes
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Net passes = passes made minus times passed. Green = gains more than loses. Red = opposite.
      </p>
      <div style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 140, right: 20, top: 5, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={130} />
            <Tooltip formatter={(v) => [Number(v), 'Net Passes']} />
            <ReferenceLine x={0} stroke="#000" />
            <Bar dataKey="net" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.net >= 0 ? '#059669' : '#DC2626'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
