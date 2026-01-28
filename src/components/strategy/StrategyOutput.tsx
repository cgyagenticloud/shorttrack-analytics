import type { StrategyResult, MatchupInsight } from '../../lib/strategy';
import { STYLE_LABELS } from '../../lib/strategy';
import PaceBar from './PaceBar';
import LapTimeline from './LapTimeline';
import ThreatCard from './ThreatCard';
import { OvertakeLapChart, ThreatComparisonChart } from './StrategyCharts';

interface Props {
  result: StrategyResult;
}

// ── Style tag classes (from UI_SPEC) ──
const STYLE_TAG: Record<string, string> = {
  late_mover: 'bg-red-50 text-red-800 border-red-200',
  front_runner: 'bg-green-50 text-green-800 border-green-200',
  mid_surge: 'bg-amber-50 text-amber-800 border-amber-200',
  balanced: 'bg-blue-50 text-blue-800 border-blue-200',
  no_passes: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function StrategyOutput({ result }: Props) {
  const {
    mySkaterName,
    mySkaterFlag,
    distance,
    lane,
    totalLaps,
    style,
    pace,
    advice,
    lapPlan,
    opponentThreats,
    matchupInsights,
    winProbability,
    lapOvertakeData,
  } = result;

  const initials = mySkaterName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="space-y-6">
      {/* Summary Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#2646A7] text-white flex items-center justify-center text-lg font-extrabold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-gray-900">
              {mySkaterFlag} {mySkaterName} — {distance}m Strategy
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Lane {lane} · {totalLaps} laps ·{' '}
              <span
                className={`inline-block px-2 py-0.5 rounded-full border text-xs font-semibold ${
                  STYLE_TAG[style] || STYLE_TAG.balanced
                }`}
              >
                {STYLE_LABELS[style] || style}
              </span>
              {opponentThreats.length > 0 && (
                <span className="ml-1">
                  · vs {opponentThreats.length} opponent
                  {opponentThreats.length > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Win Probability */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">🎲 Win Probability</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className={`text-3xl font-extrabold ${winProbability.overall >= 40 ? 'text-green-600' : winProbability.overall >= 20 ? 'text-[#2646A7]' : 'text-red-600'}`}>
              {winProbability.overall}%
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Win Chance</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-extrabold ${winProbability.podium >= 50 ? 'text-green-600' : winProbability.podium >= 25 ? 'text-[#D97706]' : 'text-red-600'}`}>
              {winProbability.podium}%
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Podium (Top 3)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold text-gray-400">
              {winProbability.laneBase}%
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Lane Base Rate</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-extrabold ${winProbability.strengthAdj > 0 ? 'text-green-600' : winProbability.strengthAdj < 0 ? 'text-red-600' : 'text-gray-500'}`}>
              {winProbability.strengthAdj > 0 ? '+' : ''}{winProbability.strengthAdj}%
            </div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">Skill Adjustment</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-4 mb-2">
          <div
            className={`h-4 rounded-full transition-all ${winProbability.overall >= 40 ? 'bg-green-500' : winProbability.overall >= 20 ? 'bg-[#2646A7]' : 'bg-red-500'}`}
            style={{ width: `${winProbability.overall}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 text-center">{winProbability.explanation}</p>
        {!winProbability.hasOpponents && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            ⚠️ <strong>No opponents selected</strong> — Win probability is based on lane position only. Add opponents for a personalized strategy.
          </div>
        )}
      </div>

      {/* Key Advice */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-base font-bold text-gray-900 mb-4">
          💡 Key Strategy Tips
        </h3>
        <ul className="space-y-3">
          {advice.map((a, idx) => (
            <li key={idx} className="flex items-start gap-3 text-sm text-gray-700">
              <span className="text-lg flex-shrink-0 mt-0.5">{a.icon}</span>
              <span dangerouslySetInnerHTML={{ __html: a.text }} />
            </li>
          ))}
        </ul>
      </div>

      {/* Pace + Lap Timeline */}
      <PaceBar pace={pace} totalLaps={totalLaps} />
      <LapTimeline lapPlan={lapPlan} />

      {/* Opponent Threats */}
      {opponentThreats.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">
            🎯 Opponent Threat Assessment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {opponentThreats.map((opp, idx) => (
              <ThreatCard key={idx} opponent={opp} rank={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Style Matchup Insights */}
      {matchupInsights.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">
            ⚔️ Style Matchup Analysis
          </h3>
          <div className="space-y-2">
            {matchupInsights.map((m: MatchupInsight, idx: number) => (
              <div
                key={idx}
                className={`flex items-start gap-2 text-sm rounded-lg px-3 py-2 ${
                  m.advantage
                    ? 'bg-green-50 text-green-800'
                    : m.disadvantage
                      ? 'bg-red-50 text-red-800'
                      : 'bg-gray-50 text-gray-700'
                }`}
              >
                <span className="flex-shrink-0 mt-0.5">
                  {m.advantage ? '✅' : m.disadvantage ? '⚠️' : '⚖️'}
                </span>
                <span>
                  <strong>
                    {m.flag} {m.opponent}:
                  </strong>{' '}
                  {m.note}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <OvertakeLapChart data={lapOvertakeData} />
        <ThreatComparisonChart opponents={opponentThreats} />
      </div>
    </div>
  );
}
