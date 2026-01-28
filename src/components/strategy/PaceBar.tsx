import type { Pace } from '../../lib/strategy';

interface Props {
  pace: Pace;
  totalLaps: number;
}

export default function PaceBar({ pace, totalLaps }: Props) {
  const earlyEnd = Math.ceil(totalLaps * 0.33);
  const midEnd = Math.ceil(totalLaps * 0.67);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-bold text-gray-900 mb-4">
        🏎️ Recommended Pace
      </h3>

      {/* Bar */}
      <div className="flex rounded-lg overflow-hidden h-11 text-sm font-bold text-white">
        <div
          className="flex items-center justify-center bg-[#207DC9] transition-all"
          style={{ flex: pace.early }}
        >
          Early {pace.early}%
        </div>
        <div
          className="flex items-center justify-center bg-[#2646A7] transition-all"
          style={{ flex: pace.middle }}
        >
          Mid {pace.middle}%
        </div>
        <div
          className="flex items-center justify-center bg-[#0B1B61] transition-all"
          style={{ flex: pace.late }}
        >
          Late {pace.late}%
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-400 font-medium">
        <span>Laps 1–{earlyEnd}</span>
        <span>Laps {earlyEnd + 1}–{midEnd}</span>
        <span>Laps {midEnd + 1}–{totalLaps}</span>
      </div>
    </div>
  );
}
