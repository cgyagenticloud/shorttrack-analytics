import { useState, useMemo } from 'react';
import type { Skater, Heat, PassEvent, Category, Gender, CrashEvent, Incident } from '../types/data';
import { filterSkaters, filterHeats, filterPasses, filterCrashes, filterIncidents } from '../hooks/useFilters';
import FilterBar from '../components/forms/FilterBar';
import KPICard from '../components/cards/KPICard';
import TopOvertakersChart from '../components/charts/TopOvertakersChart';
import TimingChart from '../components/charts/TimingChart';
import DistanceChart from '../components/charts/DistanceChart';
import LapFreqChart from '../components/charts/LapFreqChart';
import TransitionChart from '../components/charts/TransitionChart';
import StyleChart from '../components/charts/StyleChart';
import NetPassChart from '../components/charts/NetPassChart';
import SkaterTable from '../components/SkaterTable';
import CrashPhaseChart from '../components/charts/CrashPhaseChart';
import CrashContextChart from '../components/charts/CrashContextChart';
import CrashDistanceChart from '../components/charts/CrashDistanceChart';
import CrashConfidenceChart from '../components/charts/CrashConfidenceChart';
import CrashLapHeatmap from '../components/charts/CrashLapHeatmap';
import CrashRiskTable from '../components/charts/CrashRiskTable';
import CrashPredictionInsights from '../components/charts/CrashPredictionInsights';
import ActiveSkatersChart from '../components/charts/ActiveSkatersChart';
import PBDistributionChart from '../components/charts/PBDistributionChart';
import MethodologyCard from '../components/cards/MethodologyCard';

interface Props {
  skaters: Skater[];
  heats: Heat[];
  passes: PassEvent[];
  crashes: CrashEvent[];
  incidents: Incident[];
  category: Category | 'all';
}

const isYouthCategory = (cat: string) => cat.startsWith('youth_');

const SEASON_OPTIONS = [
  { value: 'all', label: 'All Seasons' },
  { value: '2021/2022', label: '2021-2022' },
  { value: '2022/2023', label: '2022-2023' },
  { value: '2023/2024', label: '2023-2024' },
  { value: '2024/2025', label: '2024-2025' },
  { value: '2025/2026', label: '2025-2026' },
];

export default function Analytics({ skaters, heats, passes, crashes, incidents, category }: Props) {
  const [gender, setGender] = useState<Gender | 'all'>('all');
  const [distance, setDistance] = useState<number | 'all'>('all');
  const [nationality, setNationality] = useState<string | 'all'>('all');
  const [season, setSeason] = useState<string>('all');

  // Reset season when switching to non-youth category
  const effectiveSeason = (category !== 'all' && isYouthCategory(category)) ? season : 'all';

  const filters = { category, gender, distance };

  // Get sorted nationality list from skaters matching category
  const nationalities = useMemo(() => {
    const cats = category === 'all' ? skaters : skaters.filter((s) => s.category === category);
    const nats = new Set(cats.map((s) => s.nationality));
    return [...nats].sort();
  }, [skaters, category]);

  const filteredSkaters = useMemo(() => {
    let result = filterSkaters(skaters, filters);
    if (nationality !== 'all') result = result.filter((s) => s.nationality === nationality);
    // Apply season filter for youth categories
    if (effectiveSeason !== 'all') {
      result = result.filter((s) => s.seasons?.includes(effectiveSeason));
    }
    return result;
  }, [skaters, category, gender, nationality, effectiveSeason]);

  // Build a set of skater IDs for nationality filtering on heats/passes/crashes/incidents
  const skaterIdSet = useMemo(() => {
    if (nationality === 'all') return null;
    return new Set(filteredSkaters.map((s) => s.id));
  }, [filteredSkaters, nationality]);

  const filteredHeats = useMemo(() => {
    let result = filterHeats(heats, filters);
    if (skaterIdSet) result = result.filter((h) => skaterIdSet.has(h.skater_id));
    return result;
  }, [heats, category, gender, distance, skaterIdSet]);

  const filteredPasses = useMemo(() => {
    let result = filterPasses(passes, filters);
    if (skaterIdSet) result = result.filter((p) => skaterIdSet.has(p.skater_id));
    return result;
  }, [passes, category, gender, distance, skaterIdSet]);

  const filteredCrashes = useMemo(() => {
    let result = filterCrashes(crashes, filters);
    if (skaterIdSet) result = result.filter((c) => skaterIdSet.has(c.skater_id));
    return result;
  }, [crashes, category, gender, distance, skaterIdSet]);

  const filteredIncidents = useMemo(() => {
    let result = filterIncidents(incidents, filters);
    if (skaterIdSet) result = result.filter((i) => skaterIdSet.has(i.skater_id));
    return result;
  }, [incidents, category, gender, distance, skaterIdSet]);

  // KPI computations
  // For youth categories, use skater stats; for ISU categories, use heats
  const isYouth = category !== 'all' && isYouthCategory(category);
  const totalRacesFromHeats = filteredHeats.length;
  const totalRacesFromSkaters = filteredSkaters.reduce((sum, s) => sum + (s.stats?.total_races || 0), 0);
  const totalRaces = isYouth ? totalRacesFromSkaters : totalRacesFromHeats;
  const totalOvertakes = filteredPasses.length;
  const totalSkaters = filteredSkaters.length;
  const uniqueEvents = new Set(filteredHeats.map((h) => h.event_id)).size;
  // For youth, count unique competitions from skater events
  const youthEvents = isYouth 
    ? new Set(filteredSkaters.flatMap(s => s.events?.map(e => e.name) || [])).size
    : uniqueEvents;
  const totalCrashes = filteredCrashes.length;
  const highConfCrashes = filteredCrashes.filter((c) => c.confidence === 'high').length;
  const totalIncidents = filteredIncidents.length;
  const uniqueHeatIds = new Set(filteredHeats.map((h) => h.heat_id)).size;
  const crashRate = uniqueHeatIds > 0 ? (totalCrashes / uniqueHeatIds * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">📊 Analytics</h1>
        <p className="text-gray-500 mt-1">
          Explore the data — who overtakes the most, when, and how.
        </p>
      </div>

      {/* Filter bar */}
      <FilterBar
        gender={gender}
        distance={distance}
        onGenderChange={setGender}
        onDistanceChange={setDistance}
        nationalities={nationalities}
        nationality={nationality}
        onNationalityChange={setNationality}
      />

      {/* Season filter — only for Youth categories */}
      {category !== 'all' && isYouthCategory(category) && (
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-600">Season</span>
          <div className="flex gap-1">
            {SEASON_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSeason(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  effectiveSeason === opt.value
                    ? 'bg-[#2646A7] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard value={totalRaces} label={isYouth ? "Total Race Starts" : "Total Race Entries"} />
        <KPICard value={totalOvertakes} label="Total Overtakes" />
        <KPICard value={totalSkaters} label="Skaters" />
        <KPICard value={isYouth ? youthEvents : uniqueEvents} label={isYouth ? "Competitions" : "Events"} />
      </div>

      {/* Active Skaters by Season (full width) */}
      <ActiveSkatersChart category={category} gender={gender} />

      {/* Top Overtakers (full width) */}
      <TopOvertakersChart skaters={filteredSkaters} />

      {/* PB Distribution Charts (only for youth categories) */}
      {isYouth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PBDistributionChart skaters={filteredSkaters} distance="500" />
          <PBDistributionChart skaters={filteredSkaters} distance="1000" />
          <PBDistributionChart skaters={filteredSkaters} distance="1500" />
        </div>
      )}

      {/* Timing + Distance (2-column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TimingChart passes={filteredPasses} />
        <DistanceChart passes={filteredPasses} />
      </div>

      {/* Lap Frequency (full width) */}
      <LapFreqChart passes={filteredPasses} />

      {/* Transition + Style (2-column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <TransitionChart passes={filteredPasses} />
        <StyleChart skaters={filteredSkaters} />
      </div>

      {/* Net Pass (full width) */}
      <NetPassChart skaters={filteredSkaters} />

      {/* ═══════════════════ FALL / CRASH ANALYTICS ═══════════════════ */}
      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-xl font-extrabold text-gray-900 mb-1">💥 Fall & Incident Analytics</h2>
        <p className="text-gray-500 text-sm mb-4">
          Crash detection via lap-time spike analysis. Includes penalties, DNFs, and DNS incidents.
        </p>
      </div>

      {/* Crash KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard value={totalCrashes} label="Detected Falls" />
        <KPICard value={highConfCrashes} label="High-Confidence Falls" />
        <KPICard value={totalIncidents} label="Total Incidents" />
        <KPICard value={`${crashRate}%`} label="Fall Rate / Heat" />
      </div>

      {/* Prediction insights (full width) */}
      <CrashPredictionInsights crashes={filteredCrashes} incidents={filteredIncidents} />

      {/* Phase + Context (2-column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CrashPhaseChart crashes={filteredCrashes} />
        <CrashContextChart crashes={filteredCrashes} />
      </div>

      {/* Distance + Confidence (2-column) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <CrashDistanceChart crashes={filteredCrashes} heats={filteredHeats} />
        <CrashConfidenceChart crashes={filteredCrashes} />
      </div>

      {/* Lap heatmap (full width) */}
      <CrashLapHeatmap crashes={filteredCrashes} />

      {/* Risk rankings table (full width) */}
      <CrashRiskTable crashes={filteredCrashes} skaters={filteredSkaters} />

      {/* Methodology — Overtake Analytics */}
      <MethodologyCard
        title="Overtake Analytics — Methodology & Metrics"
        intro="Overtake data is extracted from ISU lap-by-lap timing. A 'pass' is registered when a skater's rank improves between consecutive laps. Data covers 4 ISU World Tour events and 2 Junior World Cup events (2025-2026 season)."
        metrics={[
          { term: 'Total Race Entries', definition: 'Sum of individual skater appearances across all heats. One heat with 5 skaters = 5 race entries.' },
          { term: 'Total Overtakes', definition: 'Cumulative position gains detected across all laps of all heats.' },
          { term: 'Top Overtakers', definition: 'Ranked by total passes made across the season. Shows the most aggressive passers.' },
          { term: 'Overtake Timing', definition: 'Distribution of overtakes by race phase — Early (first ⅓ of laps), Middle (second ⅓), Late (final ⅓).' },
          { term: 'Overtakes by Distance', definition: 'Total overtakes grouped by race distance (500m / 1000m / 1500m).' },
          { term: 'Lap Frequency', definition: 'Number of overtakes per lap number across all heats, showing which laps see the most position changes.' },
          { term: 'Position Transitions', definition: 'Heatmap of rank-before → rank-after transitions, showing common overtake patterns.' },
          { term: 'Skater Styles', definition: 'Classification based on when a skater\'s overtakes occur — Late Mover, Front Runner, Mid-Race Surge, Balanced, or No Passes.' },
          { term: 'Net Pass Distribution', definition: 'Histogram of net passes (passes made − times passed) across all skaters. Positive = net overtaker.' },
        ]}
      />

      {/* Methodology — Fall Analytics */}
      <MethodologyCard
        title="Fall & Incident Analytics — Methodology & Metrics"
        intro="Falls are inferred from lap-time anomalies — when a skater's lap time spikes significantly vs their previous lap, combined with a position drop. This is not official penalty/crash data; it's a statistical inference. Incidents (penalty, DNF, DNS) come from official ISU result codes."
        metrics={[
          { term: 'Detected Falls', definition: 'Total inferred crash events based on lap-time spike analysis. A fall is flagged when a skater loses positions AND their lap time increases abnormally.' },
          { term: 'High-Confidence Falls', definition: 'Falls where the lap-time spike ratio ≥ 2.0× (the lap took at least double the previous lap). Very likely a real crash or severe incident.' },
          { term: 'Time Spike Ratio', definition: 'crash_lap_time ÷ previous_lap_time. Ratio of 1.0 = no change; 2.0 = took twice as long; 3.0+ = almost certainly a fall or stoppage.' },
          { term: 'Confidence Levels', definition: 'High: spike ≥2×. Medium: spike 1.5×–2×. Low: spike 1.0×–1.5× with significant position loss.' },
          { term: 'Race Phase', definition: 'When the fall occurred: Early (first ⅓ of laps), Middle (second ⅓), Late (final ⅓).' },
          { term: 'Position Context', definition: 'Where the skater was when they fell: Leading (P1), Chasing (P2–P3), or In Pack (P4+).' },
          { term: 'Positions Lost', definition: 'rank_after − rank_before. Measures severity of the fall\'s competitive impact.' },
          { term: 'Fall Rate / Heat', definition: 'Total detected falls ÷ unique heats × 100%. Shows how frequently falls occur per race.' },
          { term: 'Crash Risk Score', definition: 'Composite ranking: 3 × high-confidence falls + 1 × other falls + 0.5 × crash rate. Higher = more crash-prone skater.' },
          { term: 'Penalty', definition: 'Official ISU penalty — rule violation (e.g., impeding, false start). From results data, not inferred.' },
          { term: 'DNF / DNS', definition: 'Did Not Finish / Did Not Start. Official result codes indicating a skater withdrew or failed to complete the race.' },
        ]}
      />

      {/* Full table */}
      <SkaterTable skaters={filteredSkaters} />
    </div>
  );
}
