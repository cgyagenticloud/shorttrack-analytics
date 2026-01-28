// ── Core Data Types ── (Schema v3.0)
//
// Unified schema: every skater record has the same shape regardless of
// data source (ISU, shorttracklive.info, shorttrackonline.info).
// Nullable fields use `| null` (always present, never undefined).

export type Category = 'senior' | 'junior' | 'youth_ja' | 'youth_jb' | 'youth_jc' | 'youth_jd' | 'youth_je' | 'youth_jf' | 'youth_jg';
export type Gender = 'Men' | 'Women';
export type Stage = 'early' | 'middle' | 'late';
export type Style = 'late_mover' | 'front_runner' | 'mid_surge' | 'balanced' | 'no_passes' | 'developing' | 'sprint' | 'unknown';

export const STYLE_LABELS: Record<Style, string> = {
  late_mover: 'Late Mover',
  front_runner: 'Front Runner',
  mid_surge: 'Mid-Race Surge',
  balanced: 'Balanced',
  no_passes: 'No Passes',
  developing: 'Developing',
  sprint: 'Sprint',
  unknown: 'Unknown',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  senior: 'Senior',
  junior: 'Junior',
  youth_ja: 'Youth JA (17-18)',
  youth_jb: 'Youth JB (15-16)',
  youth_jc: 'Youth JC (13-14)',
  youth_jd: 'Youth JD (11-12)',
  youth_je: 'Youth JE (9-10)',
  youth_jf: 'Youth JF (7-8)',
  youth_jg: 'Youth JG (6-7)',
};

// ── Manifest ──

export interface DataSourceInfo {
  provider: string;
  categories?: string[];
  events?: number;
  skaters?: number;
  updated: string;
}

export interface Manifest {
  version: string;
  last_updated: string;
  season: string;
  sources: Record<string, DataSourceInfo>;
  stats?: Record<string, number>;
}

// ── Skater (Unified Schema) ──

export interface Medal {
  gold: number;
  silver: number;
  bronze: number;
  total: number;
}

export interface SkaterStats {
  // Race counts
  total_races: number;
  competitions_entered: number;
  medals: Medal;
  finals_appearances: number;

  // Pass analysis
  total_passes_made: number;
  total_times_passed: number;
  net_passes: number;
  avg_passes_per_race: number;
  passes_early: number;
  passes_middle: number;
  passes_late: number;
  style: Style;
  threat_score: number;

  // Performance metrics (youth-specific, null for ISU)
  avg_place: number | null;
  podium_rate: number | null;
  win_rate: number | null;

  // Discipline (ISU-specific, 0 for youth)
  penalties: number;
  dnf: number;
  dns: number;
  penalty_rate: number;
  clean_race_pct: number;
  crashes_inferred: number;
  crash_rate: number;
}

export interface SkaterEvent {
  event_id: string;
  name: string;
  season: string | null;
  races: number;
  best_rank: number | null;
  finals_reached: boolean;
  medal: string | null;
}

export interface SkaterDistance {
  distance: string;
  races: number;
  best_time: number | null;
  best_place: number | null;
  avg_place: number | null;
}

export interface PersonalBestDetail {
  distance: number;
  class: string;
  time: string;
  competition: string;
  date: string;
}

export interface SkaterProfile {
  personal_bests_detail: PersonalBestDetail[] | null;
  distance_classifications: unknown[] | null;
  overall_classifications: unknown[] | null;
}

export interface Skater {
  // Identity (always present)
  id: string;
  name: string;
  nationality: string;
  flag: string;
  gender: Gender;
  category: Category;
  source: string;

  // Bio (nullable)
  dob: string | null;
  age: number | null;
  height: number | null;
  club: string | null;
  age_category: string | null;

  // Multi-season
  seasons: string[];

  // Stats
  stats: SkaterStats;

  // Distances
  distances: SkaterDistance[];

  // Personal bests (nullable)
  personal_bests: Record<string, string> | null;

  // Events
  events: SkaterEvent[];

  // Extended profile (nullable)
  profile: SkaterProfile | null;
}

// ── Event ──

export interface Event {
  id: string;
  name: string;
  category: Category;
  season: string;
  date_start: string;
  date_end: string;
  location: string;
  source: string;
  distances: number[];
  total_heats: number;
  total_skaters: number;
}

// ── Heat ──

export interface Heat {
  heat_id: string;
  event_id: string;
  category: Category;
  distance: number;
  gender: Gender;
  round: string;
  skater_id: string;
  lane: number;
  start_rank: number;
  finish_rank: number;
  passes_made: number;
  times_passed: number;
  net_passes: number;
}

// ── Pass Event ──

export interface PassEvent {
  heat_id: string;
  event_id: string;
  category: Category;
  distance: number;
  gender: Gender;
  skater_id: string;
  lap: number;
  stage: Stage;
  rank_before: number;
  rank_after: number;
  positions: number;
}

// ── Models ──

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface OvertakeModel {
  accuracy: number;
  n_samples: number;
  overtake_rate: number;
  overtake_by_position: Record<string, number>;
  feature_importance_ranked: FeatureImportance[];
  height_effect: Record<string, number>;
  age_effect: Record<string, number>;
}

export interface MedalPositionData {
  probability: number;
  medals: number;
  total: number;
}

export interface MedalStyleData {
  probability: number;
  medals: number;
  total: number;
}

export interface MedalModel {
  accuracy: number;
  n_samples: number;
  medal_rate: number;
  medal_by_position: Record<string, MedalPositionData>;
  feature_importance: FeatureImportance[];
  medal_by_nationality: Record<string, MedalPositionData>;
  medal_by_style: Record<string, MedalStyleData>;
}

export interface LaneAdvantage {
  win_rate: number;
  total: number;
}

export interface HotspotLap {
  lap: number;
  overtakes: number;
}

export interface StyleMatchup {
  win_rate: number;
  total: number;
}

export interface StrategyData {
  lane_advantage: Record<string, Record<string, LaneAdvantage>>;
  hotspot_laps: Record<string, HotspotLap[]>;
  overtake_timing: Record<string, Record<string, { count: number; pct: number }>>;
  lap_details: Record<string, Record<string, { overtakes: number }>>;
  style_matchups: Record<string, Record<string, StyleMatchup>>;
  pace_profiles: Record<string, unknown>;
  strategy_templates: Record<string, unknown>;
  skater_list: Skater[];
}

export interface Models {
  overtake_model: OvertakeModel;
  medal_model: MedalModel;
  strategy: StrategyData;
}

// ── Incident ──

export type IncidentType = 'penalty' | 'dnf' | 'dns';

export interface Incident {
  heat_id: string;
  event_id: string;
  category: Category;
  distance: number;
  gender: Gender;
  round: string;
  skater_id: string;
  type: IncidentType;
  starting_position: number;
  laps_completed: number;
  had_lap_data: boolean;
}

// ── Crash Event ──

export type CrashConfidence = 'high' | 'medium' | 'low';
export type CrashContext = 'leading' | 'chasing' | 'pack';

export interface CrashEvent {
  heat_id: string;
  event_id: string;
  category: Category;
  distance: number;
  gender: Gender;
  round: string;
  skater_id: string;
  crash_lap: number;
  total_laps: number;
  phase: Stage;
  rank_before: number;
  rank_after: number;
  positions_lost: number;
  lap_time: number;
  prev_lap_time: number;
  time_spike_ratio: number;
  confidence: CrashConfidence;
  context: CrashContext;
}

// ── Medal Record ──

export type MedalType = 'gold' | 'silver' | 'bronze';

export interface MedalRecord {
  event_id: string;
  category: Category;
  distance: number;
  gender: Gender;
  round: string;
  heat: string;
  skater_id: string;
  medal: MedalType;
  rank: number;
  time: string;
}
