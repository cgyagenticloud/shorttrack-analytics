import type { OpponentThreat } from '../../lib/strategy';
import { STYLE_LABELS } from '../../lib/strategy';

interface Props {
  opponent: OpponentThreat;
  rank: number; // 0-indexed position in sorted threats
}

const THREAT_BORDER: Record<string, string> = {
  high: 'border-l-red-500',
  medium: 'border-l-amber-500',
  low: 'border-l-green-500',
};

const THREAT_BADGE: Record<string, string> = {
  high: 'bg-red-50 text-red-600',
  medium: 'bg-amber-50 text-amber-600',
  low: 'bg-green-50 text-green-600',
};

const THREAT_MSG: Record<string, { icon: string; text: string; color: string }> = {
  high: { icon: '⚠️', text: 'Primary threat — mark closely', color: 'text-red-600' },
  medium: { icon: '👁️', text: 'Monitor — can be dangerous', color: 'text-amber-600' },
  low: { icon: '✅', text: 'Lower priority — focus elsewhere', color: 'text-green-600' },
};

export default function ThreatCard({ opponent, rank }: Props) {
  const { threatLevel } = opponent;
  const msg = THREAT_MSG[threatLevel];
  const styleName = STYLE_LABELS[opponent.style] || opponent.style;

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${THREAT_BORDER[threatLevel]} p-4 space-y-2`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg">{opponent.flag}</span>
          <span className="font-bold text-gray-900 text-sm truncate">
            {opponent.name}
          </span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${THREAT_BADGE[threatLevel]}`}
        >
          {opponent.threat_score}
        </span>
      </div>

      {/* Details */}
      <div className="text-xs text-gray-500 space-y-0.5">
        <div>
          {opponent.lane && (
            <>
              <span className="text-gray-400">Lane:</span>{' '}
              <span className="font-medium text-gray-700">{opponent.lane}</span>
              <span className="mx-1.5">·</span>
            </>
          )}
          <span className="text-gray-400">Style:</span>{' '}
          <span className="font-medium text-gray-700">{styleName}</span>
        </div>
        <div>
          <span className="text-gray-400">Net:</span>{' '}
          <span
            className={`font-medium ${
              opponent.net_passes > 0
                ? 'text-green-600'
                : opponent.net_passes < 0
                  ? 'text-red-600'
                  : 'text-gray-700'
            }`}
          >
            {opponent.net_passes > 0 ? '+' : ''}
            {opponent.net_passes}
          </span>
          <span className="mx-1.5">·</span>
          <span className="text-gray-400">Avg/race:</span>{' '}
          <span className="font-medium text-gray-700">
            {opponent.avg_passes_per_race}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Penalties:</span>{' '}
          <span className="font-medium text-gray-700">{opponent.penalties}</span>
          <span className="mx-1.5">·</span>
          <span className="text-gray-400">Crashes:</span>{' '}
          <span className="font-medium text-gray-700">{opponent.crash_count}</span>
        </div>
      </div>

      {/* Threat message for top 3 */}
      {rank < 3 && msg && (
        <div className={`text-xs font-semibold mt-1 ${msg.color}`}>
          {msg.icon} {msg.text}
        </div>
      )}
    </div>
  );
}
