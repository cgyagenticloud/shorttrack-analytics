import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from 'recharts';
import type { CrashEvent, CrashConfidence } from '../../types/data';

interface Props {
  crashes: CrashEvent[];
}

const CONFIDENCE_COLORS: Record<CrashConfidence, string> = {
  high: '#DC2626',
  medium: '#D97706',
  low: '#94A3B8',
};

const CONFIDENCE_LABELS: Record<CrashConfidence, string> = {
  high: 'High (≥2x spike)',
  medium: 'Medium',
  low: 'Low',
};

export default function CrashConfidenceChart({ crashes }: Props) {
  const counts: Record<CrashConfidence, number> = { high: 0, medium: 0, low: 0 };
  for (const c of crashes) {
    counts[c.confidence] = (counts[c.confidence] || 0) + 1;
  }

  const data = (['high', 'medium', 'low'] as CrashConfidence[]).map((conf) => ({
    confidence: CONFIDENCE_LABELS[conf],
    key: conf,
    count: counts[conf] || 0,
  }));

  const highPct = crashes.length > 0
    ? ((counts.high / crashes.length) * 100).toFixed(1)
    : '0';

  if (crashes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Detection Confidence</h2>
        <p className="text-gray-400 text-sm text-center py-8">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">🔍 Detection Confidence</h2>
      <div style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="confidence" tick={{ fontSize: 12, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => [`${v} falls`, '']} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((d) => (
                <Cell key={d.key} fill={CONFIDENCE_COLORS[d.key]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-400 mt-2 text-center">
        {highPct}% of detected falls are high-confidence (lap time spike ≥ 2x)
      </p>
    </div>
  );
}
