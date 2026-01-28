import { useState, useCallback } from 'react';
import type { Skater, Style } from '../../types/data';
import SkaterSearch from './SkaterSearch';
import {
  buildOpponentThreat,
  buildCustomSkater,
  computeThreatLevel,
  STYLE_LABELS,
} from '../../lib/strategy';
import type { OpponentThreat, CustomSkaterInput } from '../../lib/strategy';

// ── Props ──
interface Props {
  skaters: Skater[];
  onGenerate: (data: HeatSetupData) => void;
}

export interface HeatSetupData {
  distance: string;
  lane: number;
  mySkater: Skater;
  opponents: OpponentThreat[];
}

// ── Constants ──
const DISTANCES = ['500', '1000', '1500'];
const LANES = [1, 2, 3, 4, 5, 6];
const STYLES: Style[] = ['late_mover', 'front_runner', 'mid_surge', 'balanced', 'no_passes'];

const SKILL_PRESETS: Record<string, { pass_rate: number; passed_rate: number; threat: number }> = {
  beginner: { pass_rate: 1, passed_rate: 6, threat: 15 },
  intermediate: { pass_rate: 3, passed_rate: 4, threat: 35 },
  advanced: { pass_rate: 5, passed_rate: 3, threat: 55 },
  elite: { pass_rate: 8, passed_rate: 2, threat: 80 },
};

const THREAT_BG: Record<string, string> = {
  high: 'bg-red-50 border-red-200 text-red-700',
  medium: 'bg-amber-50 border-amber-200 text-amber-700',
  low: 'bg-green-50 border-green-200 text-green-700',
};

// ── Country flags ──
const COUNTRY_FLAGS: Record<string, string> = {
  KOR: '🇰🇷', USA: '🇺🇸', CAN: '🇨🇦', CHN: '🇨🇳', JPN: '🇯🇵', NED: '🇳🇱', GBR: '🇬🇧',
  FRA: '🇫🇷', GER: '🇩🇪', ITA: '🇮🇹', RUS: '🇷🇺', AUS: '🇦🇺', BEL: '🇧🇪', HUN: '🇭🇺',
  POL: '🇵🇱', ESP: '🇪🇸', SUI: '🇨🇭', AUT: '🇦🇹', SWE: '🇸🇪', NOR: '🇳🇴',
  DEN: '🇩🇰', FIN: '🇫🇮', BRA: '🇧🇷', MEX: '🇲🇽', COL: '🇨🇴', ARG: '🇦🇷',
  KAZ: '🇰🇿', UZB: '🇺🇿', ISR: '🇮🇱', TPE: '🇹🇼', IND: '🇮🇳', THA: '🇹🇭',
  MAS: '🇲🇾', SGP: '🇸🇬', PHI: '🇵🇭', RSA: '🇿🇦', TUR: '🇹🇷', CZE: '🇨🇿',
  SVK: '🇸🇰', SLO: '🇸🇮', CRO: '🇭🇷', BUL: '🇧🇬', ROU: '🇷🇴', GRE: '🇬🇷',
  POR: '🇵🇹', IRL: '🇮🇪', BLR: '🇧🇾', UKR: '🇺🇦', LAT: '🇱🇻', LTU: '🇱🇹',
  EST: '🇪🇪', NZL: '🇳🇿', HKG: '🇭🇰',
};

function getFlag(code: string): string {
  return COUNTRY_FLAGS[code.toUpperCase()] || '🏳️';
}

// ── Custom Skater Form ──
function CustomSkaterForm({
  label,
  onDone,
  onCancel,
}: {
  label: string;
  onDone: (input: CustomSkaterInput) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [style, setStyle] = useState<Style>('balanced');
  const [skillLevel, setSkillLevel] = useState('intermediate');
  const [passRate, setPassRate] = useState(SKILL_PRESETS.intermediate.pass_rate);
  const [passedRate, setPassedRate] = useState(SKILL_PRESETS.intermediate.passed_rate);
  const [threat, setThreat] = useState(SKILL_PRESETS.intermediate.threat);

  const applyPreset = (level: string) => {
    setSkillLevel(level);
    const p = SKILL_PRESETS[level];
    if (p) {
      setPassRate(p.pass_rate);
      setPassedRate(p.passed_rate);
      setThreat(p.threat);
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onDone({
      name: name.trim(),
      nationality: country.toUpperCase() || 'UNK',
      flag: getFlag(country),
      style,
      pass_rate: passRate,
      passed_rate: passedRate,
      threat,
    });
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-bold text-gray-700">{label}</h4>
        <button
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          ✕ Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. John Smith"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2646A7]"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Country Code
          </label>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value.slice(0, 3))}
            placeholder="e.g. KOR"
            maxLength={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2646A7] uppercase"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          Skating Style
        </label>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => (
            <button
              key={s}
              onClick={() => setStyle(s)}
              className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                style === s
                  ? 'bg-[#2646A7] text-white border-[#2646A7]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {STYLE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-500 mb-1">
          Skill Level
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(SKILL_PRESETS).map((level) => (
            <button
              key={level}
              onClick={() => applyPreset(level)}
              className={`px-3 py-1 text-xs font-medium rounded-full border capitalize transition-colors ${
                skillLevel === level
                  ? 'bg-[#2646A7] text-white border-[#2646A7]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="font-semibold">Passes Made / Race</span>
            <span className="font-bold text-gray-700">{passRate}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={passRate}
            onChange={(e) => setPassRate(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2646A7]"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="font-semibold">Times Passed / Race</span>
            <span className="font-bold text-gray-700">{passedRate}</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            value={passedRate}
            onChange={(e) => setPassedRate(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2646A7]"
          />
        </div>
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span className="font-semibold">Threat Score</span>
            <span className="font-bold text-gray-700">{threat}</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={threat}
            onChange={(e) => setThreat(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2646A7]"
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!name.trim()}
        className="w-full py-2 bg-[#2646A7] text-white text-sm font-semibold rounded-lg hover:bg-[#0B1B61] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        ✓ Add {label.includes('Opponent') ? 'Opponent' : 'Skater'}
      </button>
    </div>
  );
}

// ── Main Component ──
export default function HeatSetup({ skaters, onGenerate }: Props) {
  const [distance, setDistance] = useState('1000');
  const [lane, setLane] = useState(1);

  // My skater
  const [mySkater, setMySkater] = useState<Skater | null>(null);
  const [mySkaterMode, setMySkaterMode] = useState<'search' | 'custom'>('search');

  // Opponents
  const [opponents, setOpponents] = useState<OpponentThreat[]>([]);
  const [showCustomOpponent, setShowCustomOpponent] = useState(false);

  const excludeIds = new Set<string>();
  if (mySkater) excludeIds.add(mySkater.id);
  opponents.forEach((o) => {
    // Find skater ID from name for exclusion
    const found = skaters.find((s) => s.name === o.name);
    if (found) excludeIds.add(found.id);
  });

  const handleAddOpponent = useCallback(
    (skater: Skater) => {
      if (opponents.length >= 7) return;
      setOpponents((prev) => [...prev, buildOpponentThreat(skater)]);
    },
    [opponents.length]
  );

  const handleRemoveOpponent = useCallback((idx: number) => {
    setOpponents((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleCustomMySkater = useCallback(
    (input: CustomSkaterInput) => {
      const skater = buildCustomSkater(input);
      setMySkater(skater);
      setMySkaterMode('search'); // close form
    },
    []
  );

  const handleCustomOpponent = useCallback(
    (input: CustomSkaterInput) => {
      if (opponents.length >= 7) return;
      const skater = buildCustomSkater(input);
      const threat = buildOpponentThreat(skater);
      setOpponents((prev) => [...prev, threat]);
      setShowCustomOpponent(false);
    },
    [opponents.length]
  );

  const handleGenerate = () => {
    if (!mySkater) return;
    onGenerate({ distance, lane, mySkater, opponents });
  };

  const canGenerate = mySkater !== null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-bold text-gray-900">⚙️ Race Setup</h2>

      {/* Distance & Lane */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Distance */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Distance
          </label>
          <div className="flex gap-2">
            {DISTANCES.map((d) => (
              <button
                key={d}
                onClick={() => setDistance(d)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg border transition-colors ${
                  distance === d
                    ? 'bg-[#2646A7] text-white border-[#2646A7]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#2646A7] hover:text-[#2646A7]'
                }`}
              >
                {d}m
              </button>
            ))}
          </div>
        </div>

        {/* Lane */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Starting Lane
          </label>
          <div className="flex gap-1.5">
            {LANES.map((l) => (
              <button
                key={l}
                onClick={() => setLane(l)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg border transition-colors ${
                  lane === l
                    ? 'bg-[#2646A7] text-white border-[#2646A7]'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-[#2646A7] hover:text-[#2646A7]'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* My Skater */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            My Skater
          </label>
          <button
            onClick={() => {
              setMySkaterMode(mySkaterMode === 'search' ? 'custom' : 'search');
              if (mySkaterMode === 'search') setMySkater(null);
            }}
            className="text-xs text-[#207DC9] hover:text-[#2646A7] font-medium"
          >
            {mySkaterMode === 'search' ? '✏️ Enter custom' : '🔍 Search database'}
          </button>
        </div>

        {mySkaterMode === 'search' ? (
          <>
            {mySkater ? (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                <span className="text-lg">{mySkater.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm truncate">
                    {mySkater.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {mySkater.nationality} · {STYLE_LABELS[mySkater.stats.style]}
                  </p>
                </div>
                <button
                  onClick={() => setMySkater(null)}
                  className="text-gray-400 hover:text-red-500 text-lg"
                >
                  ✕
                </button>
              </div>
            ) : (
              <SkaterSearch
                skaters={skaters}
                onSelect={(s) => setMySkater(s)}
                placeholder="Search for your skater..."
                excludeIds={excludeIds}
              />
            )}
          </>
        ) : (
          <CustomSkaterForm
            label="My Skater"
            onDone={handleCustomMySkater}
            onCancel={() => setMySkaterMode('search')}
          />
        )}
      </div>

      {/* Opponents */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Opponents ({opponents.length}/7)
          </label>
          {opponents.length < 7 && !showCustomOpponent && (
            <button
              onClick={() => setShowCustomOpponent(true)}
              className="text-xs text-[#207DC9] hover:text-[#2646A7] font-medium"
            >
              ✏️ Add custom opponent
            </button>
          )}
        </div>

        {/* Opponent search */}
        {opponents.length < 7 && !showCustomOpponent && (
          <SkaterSearch
            skaters={skaters}
            onSelect={handleAddOpponent}
            placeholder="Search opponent to add..."
            excludeIds={excludeIds}
          />
        )}

        {/* Custom opponent form */}
        {showCustomOpponent && (
          <CustomSkaterForm
            label="Custom Opponent"
            onDone={handleCustomOpponent}
            onCancel={() => setShowCustomOpponent(false)}
          />
        )}

        {/* Opponent chips */}
        {opponents.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {opponents.map((opp, idx) => {
              const level = computeThreatLevel(opp.threat_score);
              return (
                <div
                  key={idx}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${THREAT_BG[level]}`}
                >
                  <span>{opp.flag}</span>
                  <span>{opp.name}</span>
                  <span className="opacity-70">({opp.threat_score})</span>
                  <button
                    onClick={() => handleRemoveOpponent(idx)}
                    className="ml-1 opacity-50 hover:opacity-100"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="w-full py-3 bg-[#2646A7] text-white font-extrabold text-base rounded-xl hover:bg-[#0B1B61] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow"
      >
        🎯 Generate Strategy
      </button>
    </div>
  );
}
