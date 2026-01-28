import type { CrashEvent, Skater } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
  skaters: Skater[];
}

interface SkaterCrashRow {
  name: string;
  flag: string;
  crashes: number;
  highConf: number;
  avgPosLost: number;
  races: number;
  crashRate: number;
  riskScore: number;
}

export default function CrashRiskTable({ crashes, skaters }: Props) {
  // Build lookup
  const skaterMap = new Map(skaters.map((s) => [s.id, s]));

  // Aggregate per skater
  const agg: Record<string, { crashes: number; highConf: number; totalPosLost: number }> = {};
  for (const c of crashes) {
    if (!agg[c.skater_id]) agg[c.skater_id] = { crashes: 0, highConf: 0, totalPosLost: 0 };
    agg[c.skater_id].crashes++;
    if (c.confidence === 'high') agg[c.skater_id].highConf++;
    agg[c.skater_id].totalPosLost += c.positions_lost;
  }

  const rows: SkaterCrashRow[] = Object.entries(agg)
    .map(([id, stats]) => {
      const sk = skaterMap.get(id);
      // Skip skaters not in the current filter
      if (!sk) return null;
      const races = sk.stats.total_races || 1;
      const crashRate = +(stats.crashes / races * 100).toFixed(1);
      const riskScore = +(stats.highConf * 3 + (stats.crashes - stats.highConf) + crashRate * 0.5).toFixed(1);
      return {
        name: sk.name,
        flag: sk.flag || '',
        crashes: stats.crashes,
        highConf: stats.highConf,
        avgPosLost: +(stats.totalPosLost / stats.crashes).toFixed(1),
        races,
        crashRate,
        riskScore,
      };
    })
    .filter((r): r is SkaterCrashRow => r !== null)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 15);

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">⚠️ Crash Risk Rankings</h2>
        <p className="text-gray-400 text-sm text-center py-8">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">⚠️ Crash Risk Rankings</h2>
      <p className="text-gray-500 text-sm mb-3">
        Composite risk score = 3×high-confidence + 1×other + 0.5×crash_rate
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="py-2 pr-3 text-gray-500 font-semibold">#</th>
              <th className="py-2 pr-3 text-gray-500 font-semibold">Skater</th>
              <th className="py-2 pr-3 text-gray-500 font-semibold text-right">Falls</th>
              <th className="py-2 pr-3 text-gray-500 font-semibold text-right">High Conf</th>
              <th className="py-2 pr-3 text-gray-500 font-semibold text-right">Avg Pos Lost</th>
              <th className="py-2 pr-3 text-gray-500 font-semibold text-right">Races</th>
              <th className="py-2 pr-3 text-gray-500 font-semibold text-right">Fall Rate</th>
              <th className="py-2 text-gray-500 font-semibold text-right">Risk Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                <td className="py-2 pr-3 font-medium">
                  {r.flag} {r.name}
                </td>
                <td className="py-2 pr-3 text-right">{r.crashes}</td>
                <td className="py-2 pr-3 text-right text-red-600 font-semibold">{r.highConf}</td>
                <td className="py-2 pr-3 text-right">{r.avgPosLost}</td>
                <td className="py-2 pr-3 text-right">{r.races}</td>
                <td className="py-2 pr-3 text-right">{r.crashRate}%</td>
                <td className="py-2 text-right font-bold text-[#2646A7]">{r.riskScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
