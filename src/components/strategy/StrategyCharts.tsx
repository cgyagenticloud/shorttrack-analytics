import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
} from 'recharts';
import type { LapOvertakeData, OpponentThreat } from '../../lib/strategy';

// ── Chart Colors ──
const CHART_BLUE = '#2646A7';
const CHART_GOLD = '#D97706';
const CHART_RED = '#DC2626';
const CHART_AMBER = '#F59E0B';
const CHART_GREEN = '#059669';

// ── Overtake by Lap Chart ──
interface OvertakeLapChartProps {
  data: LapOvertakeData[];
}

export function OvertakeLapChart({ data }: OvertakeLapChartProps) {
  if (data.length === 0) return null;

  const chartData = data.map((d) => ({
    name: `L${d.lap}`,
    overtakes: d.overtakes,
    isHotspot: d.isHotspot,
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">
        📊 Overtakes by Lap
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            />
            <Bar dataKey="overtakes" radius={[4, 4, 0, 0]} name="Overtakes">
              {chartData.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.isHotspot ? CHART_GOLD : CHART_BLUE}
                  fillOpacity={entry.isHotspot ? 0.9 : 0.6}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2 text-[10px] font-medium text-gray-500 justify-center">
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: CHART_BLUE, opacity: 0.6 }}
          />{' '}
          Normal
        </span>
        <span className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: CHART_GOLD, opacity: 0.9 }}
          />{' '}
          Hotspot 🔥
        </span>
      </div>
    </div>
  );
}

// ── Opponent Threat Comparison ──
interface ThreatComparisonProps {
  opponents: OpponentThreat[];
}

export function ThreatComparisonChart({ opponents }: ThreatComparisonProps) {
  if (opponents.length === 0) return null;

  const chartData = opponents.slice(0, 7).map((opp) => ({
    name: opp.name.split(' ').pop() || opp.name,
    flag: opp.flag,
    threat: opp.threat_score,
    level: opp.threatLevel,
  }));

  const getColor = (level: string) => {
    if (level === 'high') return CHART_RED;
    if (level === 'medium') return CHART_AMBER;
    return CHART_GREEN;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">
        🎯 Opponent Threat Level
      </h3>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 10, bottom: 5, left: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11, fill: '#6B7280' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}
            />
            <Bar dataKey="threat" radius={[0, 4, 4, 0]} name="Threat Score">
              {chartData.map((entry, idx) => (
                <Cell key={idx} fill={getColor(entry.level)} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
