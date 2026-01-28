import type { LapPlanItem } from '../../lib/strategy';

interface Props {
  lapPlan: LapPlanItem[];
}

const ACTION_COLORS: Record<string, string> = {
  overtake: 'bg-amber-100 text-amber-800 border-amber-300',
  push: 'bg-purple-100 text-purple-800 border-purple-300',
  hold: 'bg-blue-100 text-blue-800 border-blue-300',
  conserve: 'bg-green-100 text-green-800 border-green-300',
};

const PHASE_COLORS: Record<string, string> = {
  Early: 'text-[#207DC9]',
  Mid: 'text-[#2646A7]',
  Late: 'text-[#0B1B61]',
};

export default function LapTimeline({ lapPlan }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">
        📍 Lap-by-Lap Race Plan
      </h3>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {lapPlan.map((lp) => (
          <div
            key={lp.lap}
            className={`flex-shrink-0 w-[68px] rounded-lg border p-2 text-center transition-shadow ${
              lp.hotspot
                ? 'border-amber-300 bg-amber-50 shadow-sm'
                : 'border-gray-200 bg-white'
            }`}
          >
            <div className="text-xs font-bold text-gray-900">
              Lap {lp.lap}
              {lp.hotspot && <span className="ml-0.5">🔥</span>}
            </div>
            <div className={`text-[10px] font-semibold mt-0.5 ${PHASE_COLORS[lp.phase] || 'text-gray-500'}`}>
              {lp.phase}
            </div>
            <div
              className={`mt-1.5 text-[10px] font-bold py-1 px-1 rounded border ${
                ACTION_COLORS[lp.actionClass] || ACTION_COLORS.hold
              }`}
            >
              {lp.action}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[10px] font-medium text-gray-500">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300" /> Attack
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-purple-100 border border-purple-300" /> Push
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Hold
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-100 border border-green-300" /> Conserve
        </span>
        <span className="flex items-center gap-1">🔥 Hotspot</span>
      </div>
    </div>
  );
}
