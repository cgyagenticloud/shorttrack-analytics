import type { CrashEvent, Incident } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
  incidents: Incident[];
}

interface Insight {
  emoji: string;
  title: string;
  value: string;
  detail: string;
}

export default function CrashPredictionInsights({ crashes, incidents }: Props) {
  if (crashes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🧠 Fall Prediction Insights</h2>
        <p className="text-gray-400 text-sm text-center py-8">No data available</p>
      </div>
    );
  }

  // Compute insights
  const highConf = crashes.filter((c) => c.confidence === 'high');
  const avgSpikeRatio = crashes.reduce((s, c) => s + c.time_spike_ratio, 0) / crashes.length;
  const avgPosLost = crashes.reduce((s, c) => s + c.positions_lost, 0) / crashes.length;

  // Phase risk
  const phaseCount: Record<string, number> = { early: 0, middle: 0, late: 0 };
  for (const c of crashes) phaseCount[c.phase]++;
  const riskiestPhase = Object.entries(phaseCount).sort((a, b) => b[1] - a[1])[0];

  // Context risk
  const ctxCount: Record<string, number> = {};
  for (const c of crashes) ctxCount[c.context] = (ctxCount[c.context] || 0) + 1;
  const riskiestCtx = Object.entries(ctxCount).sort((a, b) => b[1] - a[1])[0];

  // Position before crash
  const posCount: Record<number, number> = {};
  for (const c of crashes) posCount[c.rank_before] = (posCount[c.rank_before] || 0) + 1;
  const riskiestPos = Object.entries(posCount).sort((a, b) => b[1] - a[1])[0];

  // Penalty analysis
  const penalties = incidents.filter((i) => i.type === 'penalty');
  const penaltyRate = incidents.length > 0
    ? ((penalties.length / incidents.length) * 100).toFixed(1)
    : '0';

  // Distance with highest crash rate
  const distCrash: Record<number, number> = {};
  for (const c of crashes) distCrash[c.distance] = (distCrash[c.distance] || 0) + 1;
  const topDist = Object.entries(distCrash).sort((a, b) => b[1] - a[1])[0];

  const insights: Insight[] = [
    {
      emoji: '🎯',
      title: 'High-Confidence Falls',
      value: `${highConf.length} / ${crashes.length}`,
      detail: `${(highConf.length / crashes.length * 100).toFixed(0)}% of falls show a clear lap-time spike ≥2x normal`,
    },
    {
      emoji: '📊',
      title: 'Avg Time Spike Ratio',
      value: `${avgSpikeRatio.toFixed(2)}x`,
      detail: `Falls on average show a ${avgSpikeRatio.toFixed(2)}x slower lap vs previous`,
    },
    {
      emoji: '📉',
      title: 'Avg Positions Lost',
      value: avgPosLost.toFixed(1),
      detail: `Falling costs ~${avgPosLost.toFixed(1)} positions on average`,
    },
    {
      emoji: '⏱️',
      title: 'Riskiest Phase',
      value: riskiestPhase ? `${riskiestPhase[0].charAt(0).toUpperCase() + riskiestPhase[0].slice(1)}` : 'N/A',
      detail: riskiestPhase
        ? `${riskiestPhase[1]} falls (${(riskiestPhase[1] / crashes.length * 100).toFixed(0)}%) occur in the ${riskiestPhase[0]} phase`
        : '',
    },
    {
      emoji: '🏃',
      title: 'Riskiest Position',
      value: riskiestCtx ? riskiestCtx[0].charAt(0).toUpperCase() + riskiestCtx[0].slice(1) : 'N/A',
      detail: riskiestCtx
        ? `${riskiestCtx[1]} falls (${(riskiestCtx[1] / crashes.length * 100).toFixed(0)}%) happen while ${riskiestCtx[0]}`
        : '',
    },
    {
      emoji: '🔢',
      title: 'Riskiest Starting Rank',
      value: riskiestPos ? `P${riskiestPos[0]}` : 'N/A',
      detail: riskiestPos
        ? `Position ${riskiestPos[0]} before fall — ${riskiestPos[1]} occurrences`
        : '',
    },
    {
      emoji: '📏',
      title: 'Riskiest Distance',
      value: topDist ? `${topDist[0]}m` : 'N/A',
      detail: topDist
        ? `${topDist[1]} falls in ${topDist[0]}m races — most of any distance`
        : '',
    },
    {
      emoji: '🟡',
      title: 'Penalty Rate',
      value: `${penaltyRate}%`,
      detail: `${penalties.length} penalties out of ${incidents.length} total incidents`,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-2">🧠 Fall Prediction Insights</h2>
      <p className="text-gray-500 text-sm mb-4">
        Data-driven risk factors derived from {crashes.length} detected falls and {incidents.length} incidents.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {insights.map((ins) => (
          <div
            key={ins.title}
            className="border border-gray-100 rounded-lg p-4 hover:border-[#2646A7] hover:-translate-y-0.5 transition-all"
          >
            <div className="text-2xl mb-1">{ins.emoji}</div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {ins.title}
            </div>
            <div className="text-xl font-extrabold text-[#2646A7] mt-1">{ins.value}</div>
            <p className="text-xs text-gray-400 mt-1">{ins.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
