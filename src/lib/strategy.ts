// ── Strategy Engine ──
// Ported from shorttrack-dashboard/app.js and adapted for TypeScript

import type { Skater, Style, Models, StrategyData, HotspotLap } from '../types/data';

// ── Types ──

export interface Pace {
  early: number;
  middle: number;
  late: number;
}

export interface AdviceItem {
  icon: string;
  text: string;
}

export interface LapPlanItem {
  lap: number;
  phase: 'Early' | 'Mid' | 'Late';
  hotspot: boolean;
  action: string;
  actionClass: 'hold' | 'push' | 'overtake' | 'conserve';
}

export type ThreatLevel = 'high' | 'medium' | 'low';

export interface OpponentThreat {
  name: string;
  flag: string;
  nationality: string;
  style: Style;
  threat_score: number;
  threatLevel: ThreatLevel;
  net_passes: number;
  avg_passes_per_race: number;
  total_races: number;
  medals_total: number;
  penalties: number;
  crash_count: number;
  penalty_rate: number;
  crash_rate: number;
  lane?: number;
}

export interface MatchupInsight {
  opponent: string;
  flag: string;
  advantage: boolean;
  disadvantage: boolean;
  winRate: number;
  myStyle: string;
  oppStyle: string;
  note: string;
}

export interface LapOvertakeData {
  lap: number;
  overtakes: number;
  isHotspot: boolean;
}

export interface WinProbability {
  overall: number;         // 0-100 personalized win %
  laneBase: number;        // 0-100 raw lane win rate
  strengthAdj: number;     // -50 to +50 strength adjustment
  matchupAdj: number;      // -15 to +15 matchup adjustment
  podium: number;          // 0-100 top-3 probability
  explanation: string;
  hasOpponents: boolean;   // true if calculated with actual opponents
}

export interface StrategyResult {
  mySkaterName: string;
  mySkaterFlag: string;
  distance: string;
  lane: number;
  totalLaps: number;
  style: Style;
  pace: Pace;
  advice: AdviceItem[];
  lapPlan: LapPlanItem[];
  opponentThreats: OpponentThreat[];
  matchupInsights: MatchupInsight[];
  laneWinRate: number | null;
  winProbability: WinProbability;
  lapOvertakeData: LapOvertakeData[];
}

// ── Style Labels ──
export const STYLE_LABELS: Record<string, string> = {
  late_mover: 'Late Mover',
  front_runner: 'Front Runner',
  mid_surge: 'Mid-Race Surge',
  balanced: 'Balanced',
  no_passes: 'No Passes',
};

// ── Total Laps ──
const TOTAL_LAPS: Record<string, number> = {
  '500': 5,
  '1000': 9,
  '1500': 14,
};

// ── Compute Threat Level ──
export function computeThreatLevel(threatScore: number): ThreatLevel {
  if (threatScore >= 60) return 'high';
  if (threatScore >= 30) return 'medium';
  return 'low';
}

// ── Build Opponent Threat from Skater ──
export function buildOpponentThreat(skater: Skater, lane?: number): OpponentThreat {
  const stats = skater.stats;
  const totalMedals = stats.medals
    ? (stats.medals.gold || 0) + (stats.medals.silver || 0) + (stats.medals.bronze || 0)
    : 0;
  const threatScore = stats.threat_score || 0;

  // Get discipline data - may not exist in all data sets
  const penalties = stats.penalties ?? 0;
  const crashCount = stats.crashes_inferred ?? 0;
  const penaltyRate = stats.penalty_rate ?? 0;
  const crashRate = stats.crash_rate ?? 0;

  return {
    name: skater.name,
    flag: skater.flag,
    nationality: skater.nationality,
    style: stats.style,
    threat_score: Math.round(threatScore),
    threatLevel: computeThreatLevel(threatScore),
    net_passes: stats.net_passes,
    avg_passes_per_race: Math.round(stats.avg_passes_per_race * 100) / 100,
    total_races: stats.total_races,
    medals_total: totalMedals,
    penalties,
    crash_count: crashCount,
    penalty_rate: penaltyRate,
    crash_rate: crashRate,
    lane,
  };
}

// ── Compute Pace ──
export function computePace(
  style: Style,
  distance: string,
  lane: number,
  opponents: OpponentThreat[]
): Pace {
  const paceBase: Record<string, Pace> = {
    front_runner: { early: 40, middle: 35, late: 25 },
    late_mover: { early: 25, middle: 35, late: 40 },
    mid_surge: { early: 30, middle: 40, late: 30 },
    balanced: { early: 33, middle: 34, late: 33 },
    no_passes: { early: 33, middle: 34, late: 33 },
  };

  const pace = { ...(paceBase[style] || paceBase.balanced) };

  // Distance adjustment
  if (distance === '500') {
    pace.early += 5;
    pace.late -= 5;
  }
  if (distance === '1500') {
    pace.early -= 5;
    pace.late += 5;
  }

  // Lane adjustment
  if (lane <= 2) {
    pace.early -= 3;
    pace.middle += 3;
  }
  if (lane >= 4) {
    pace.early += 3;
    pace.late -= 3;
  }

  // Opponent strength adjustment
  if (opponents.length > 0) {
    const avgThreat =
      opponents.reduce((s, o) => s + (o.threat_score || 0), 0) / opponents.length;
    if (avgThreat > 50) {
      pace.early += 2;
      pace.middle += 1;
      pace.late -= 3;
    } else if (avgThreat < 25) {
      pace.early -= 3;
      pace.late += 3;
    }
  }

  // Normalize to 100%
  const total = pace.early + pace.middle + pace.late;
  pace.early = Math.round((pace.early / total) * 100);
  pace.middle = Math.round((pace.middle / total) * 100);
  pace.late = 100 - pace.early - pace.middle;

  return pace;
}

// ── Generate Advice ──
export function generateAdvice(
  style: Style,
  distance: string,
  lane: number,
  laneAdvData: { win_rate?: number; sample_size?: number } | null,
  opponents: OpponentThreat[],
  pace: Pace,
  timing: Record<string, { count: number; pct: number }>,
  hotspots: HotspotLap[],
  matchups: MatchupInsight[],
  winProb?: WinProbability
): AdviceItem[] {
  const advice: AdviceItem[] = [];
  const totalLaps = TOTAL_LAPS[distance] || 9;

  // Personalized win probability insight (uses athlete strength)
  if (winProb) {
    const wr = winProb.overall;
    const podium = winProb.podium;
    if (wr >= 40) {
      advice.push({
        icon: '🏆',
        text: `Your personalized win chance is <strong>${wr}%</strong> (podium ${podium}%) — you have a clear edge. Stay disciplined and execute your game plan.`,
      });
    } else if (wr >= 20) {
      advice.push({
        icon: '🎲',
        text: `Your personalized win chance is <strong>${wr}%</strong> (podium ${podium}%) — competitive field. Smart tactics and clean execution will be key.`,
      });
    } else {
      advice.push({
        icon: '⚠️',
        text: `Your personalized win chance is <strong>${wr}%</strong> (podium ${podium}%) — tough opponents. Focus on clean laps, avoid crashes, and look for openings.`,
      });
    }

    // Strength context
    if (winProb.strengthAdj > 15) {
      advice.push({
        icon: '💪',
        text: `You have a significant skill advantage (+${winProb.strengthAdj}% adjustment) over this field — control the pace and don't take unnecessary risks.`,
      });
    } else if (winProb.strengthAdj < -15) {
      advice.push({
        icon: '🧠',
        text: `You're facing stronger opponents (${winProb.strengthAdj}% skill gap) — race smart, draft efficiently, and pick your moments carefully.`,
      });
    }
  } else if (laneAdvData && laneAdvData.win_rate !== undefined) {
    // Fallback to lane-only if no win probability
    const wr = Math.round(laneAdvData.win_rate * 100);
    advice.push({
      icon: '📍',
      text: `Lane ${lane} has a ${wr}% historical win rate in ${distance}m.`,
    });
  }

  // Top threat warning
  if (opponents.length > 0 && opponents[0].threat_score >= 50) {
    advice.push({
      icon: '🎯',
      text: `Watch out for ${opponents[0].flag} ${opponents[0].name} (threat ${opponents[0].threat_score}) — stay on their hip, don't let them get away.`,
    });
  }

  // Overtake timing
  const timingEntries = Object.entries(timing).sort(
    (a, b) => b[1].count - a[1].count
  );
  if (timingEntries.length > 0) {
    const [bestStage, bestData] = timingEntries[0];
    const stageLabels: Record<string, string> = {
      early: 'early laps',
      middle: 'mid-race',
      late: 'final laps',
    };
    advice.push({
      icon: '⏱️',
      text: `Most overtakes in ${distance}m happen in the ${stageLabels[bestStage] || bestStage} (${bestData.pct}%) — plan your moves for that window.`,
    });
  }

  // Hotspot laps
  if (hotspots.length > 0) {
    const lapNums = hotspots.map((h) => `Lap ${h.lap}`).join(', ');
    advice.push({
      icon: '🔥',
      text: `Overtake hotspots: ${lapNums} — be ready to attack or defend on these laps.`,
    });
  }

  // Style-specific advice
  const styleAdvice: Record<string, AdviceItem> = {
    late_mover: {
      icon: '🐍',
      text: `As a Late Mover, save energy early and stay in the pack. Launch your attack in the final ${Math.max(2, Math.ceil(totalLaps * 0.2))} laps.`,
    },
    front_runner: {
      icon: '🚀',
      text: "As a Front Runner, get to the front early and control the pace — don't let late movers draft behind you.",
    },
    mid_surge: {
      icon: '💥',
      text: 'As a Mid-Surge skater, stay near the top 3 early, then make your big move in the middle laps.',
    },
    balanced: {
      icon: '⚖️',
      text: 'As a Balanced skater, read the race and adapt — respond to attacks rather than forcing them.',
    },
    no_passes: {
      icon: '🛡️',
      text: 'Focus on clean skating and holding position. Avoid risky passing attempts.',
    },
  };
  if (styleAdvice[style]) {
    advice.push(styleAdvice[style]);
  }

  // Matchup warnings
  const badMatchups = matchups.filter((m) => m.disadvantage);
  if (badMatchups.length > 0) {
    advice.push({
      icon: '⚔️',
      text: `Style disadvantage against ${badMatchups.map((m) => `${m.flag} ${m.opponent}`).join(', ')} — avoid a direct duel; use smart positioning instead.`,
    });
  }

  // Penalty/crash warnings for opponents
  const penaltyDangers = opponents.filter((o) => o.penalty_rate > 0.15);
  if (penaltyDangers.length > 0) {
    advice.push({
      icon: '🟡',
      text: `${penaltyDangers.map((o) => `${o.flag} ${o.name}`).join(', ')} ${penaltyDangers.length > 1 ? 'get' : 'gets'} penalized often — keep your distance so you don't get caught up.`,
    });
  }

  const crashDangers = opponents.filter((o) => o.crash_rate > 0.1);
  if (crashDangers.length > 0) {
    advice.push({
      icon: '💥',
      text: `${crashDangers.map((o) => `${o.flag} ${o.name}`).join(', ')} ${crashDangers.length > 1 ? 'have' : 'has'} a high crash rate — stay clear to avoid being taken down.`,
    });
  }

  // Pace summary
  const paceDesc =
    pace.early >= 38
      ? 'front-loaded aggressive start'
      : pace.late >= 38
        ? 'back-loaded finish sprint'
        : 'even distribution';
  advice.push({
    icon: '🏎️',
    text: `Recommended pace: ${paceDesc} — Early ${pace.early}% / Mid ${pace.middle}% / Late ${pace.late}%.`,
  });

  return advice;
}

// ── Build Lap Plan ──
export function buildLapPlan(
  totalLaps: number,
  hotspotLapNums: Set<number>,
  pace: Pace,
  style: Style,
): LapPlanItem[] {
  const plan: LapPlanItem[] = [];

  for (let lap = 1; lap <= totalLaps; lap++) {
    const pct = lap / totalLaps;
    const phase: 'Early' | 'Mid' | 'Late' =
      pct <= 0.33 ? 'Early' : pct <= 0.67 ? 'Mid' : 'Late';
    const isHotspot = hotspotLapNums.has(lap);

    let action: string;
    let actionClass: LapPlanItem['actionClass'];

    if (lap === 1) {
      action = 'Position';
      actionClass = 'hold';
    } else if (lap === totalLaps) {
      action = 'Sprint!';
      actionClass = 'push';
    } else if (lap === totalLaps - 1) {
      action = style === 'late_mover' ? 'Attack!' : 'Push';
      actionClass = 'push';
    } else if (isHotspot) {
      if (style === 'front_runner' && pct <= 0.5) {
        action = 'Attack';
        actionClass = 'overtake';
      } else if (style === 'late_mover' && pct > 0.6) {
        action = 'Attack';
        actionClass = 'overtake';
      } else if (style === 'mid_surge' && pct > 0.3 && pct < 0.7) {
        action = 'Surge';
        actionClass = 'overtake';
      } else {
        action = 'Ready';
        actionClass = 'overtake';
      }
    } else if (pct <= 0.33) {
      action = pace.early >= 35 ? 'Push' : 'Conserve';
      actionClass = pace.early >= 35 ? 'hold' : 'conserve';
    } else if (pct <= 0.67) {
      action = 'Hold';
      actionClass = 'hold';
    } else {
      action = pace.late >= 35 ? 'Push' : 'Hold';
      actionClass = pace.late >= 35 ? 'push' : 'hold';
    }

    plan.push({ lap, phase, hotspot: isHotspot, action, actionClass });
  }

  return plan;
}

// ── Build matchup insights ──
function buildMatchupInsights(
  myStyle: Style,
  opponents: OpponentThreat[],
  styleMatchups: Record<string, Record<string, { win_rate: number; total: number }>>
): MatchupInsight[] {
  const insights: MatchupInsight[] = [];
  const myMatchups = styleMatchups[myStyle];
  if (!myMatchups) return insights;

  for (const opp of opponents.slice(0, 3)) {
    const oppStyle = opp.style || 'balanced';
    const matchup = myMatchups[oppStyle];
    if (matchup && matchup.total >= 5) {
      const wr = matchup.win_rate;
      const advantage = wr > 0.55;
      const disadvantage = wr < 0.45;
      let note: string;
      if (advantage) {
        note = `Your ${STYLE_LABELS[myStyle]} style wins ${Math.round(wr * 100)}% against ${STYLE_LABELS[oppStyle]}`;
      } else if (disadvantage) {
        note = `${STYLE_LABELS[oppStyle]} beats your style ${Math.round((1 - wr) * 100)}% of the time — adjust tactics!`;
      } else {
        note = `Even matchup (${Math.round(wr * 100)}%) — race execution will decide`;
      }
      insights.push({
        opponent: opp.name,
        flag: opp.flag,
        advantage,
        disadvantage,
        winRate: wr,
        myStyle,
        oppStyle,
        note,
      });
    }
  }

  return insights;
}

// ── Build lap overtake data for chart ──
function buildLapOvertakeData(
  distance: string,
  strategyData: StrategyData,
  hotspotLapNums: Set<number>,
  totalLaps: number
): LapOvertakeData[] {
  const lapDetails = strategyData.lap_details?.[distance] || {};
  const data: LapOvertakeData[] = [];

  for (let i = 1; i <= totalLaps; i++) {
    const detail = lapDetails[String(i)] as { overtakes?: number } | undefined;
    data.push({
      lap: i,
      overtakes: detail?.overtakes || 0,
      isHotspot: hotspotLapNums.has(i),
    });
  }

  return data;
}

// ── Custom Skater Builder ──
export interface CustomSkaterInput {
  name: string;
  nationality: string;
  flag: string;
  style: Style;
  pass_rate: number; // 0-10 slider
  passed_rate: number; // 0-10 slider
  threat: number; // 0-100
}

export function buildCustomSkater(input: CustomSkaterInput): Skater {
  const totalRaces = 10;
  const passesMade = Math.round(input.pass_rate * totalRaces);
  const timesPassed = Math.round(input.passed_rate * totalRaces);
  const netPasses = passesMade - timesPassed;

  // Distribute passes by style
  let early = 0, middle = 0, late = 0;
  switch (input.style) {
    case 'front_runner': early = Math.round(passesMade * 0.5); middle = Math.round(passesMade * 0.3); late = passesMade - early - middle; break;
    case 'late_mover': late = Math.round(passesMade * 0.5); middle = Math.round(passesMade * 0.3); early = passesMade - late - middle; break;
    case 'mid_surge': middle = Math.round(passesMade * 0.5); early = Math.round(passesMade * 0.25); late = passesMade - middle - early; break;
    default: early = Math.round(passesMade * 0.33); middle = Math.round(passesMade * 0.34); late = passesMade - early - middle; break;
  }

  return {
    id: `custom-${input.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: input.name,
    nationality: input.nationality,
    flag: input.flag || '🏳️',
    gender: 'Men',
    category: 'senior',
    source: 'custom',
    dob: null,
    age: null,
    height: null,
    club: null,
    age_category: null,
    seasons: [],
    personal_bests: null,
    profile: null,
    stats: {
      total_races: totalRaces,
      competitions_entered: 0,
      total_passes_made: passesMade,
      total_times_passed: timesPassed,
      net_passes: netPasses,
      avg_passes_per_race: input.pass_rate,
      passes_early: early,
      passes_middle: middle,
      passes_late: late,
      style: input.style,
      threat_score: input.threat,
      finals_appearances: 0,
      medals: { gold: 0, silver: 0, bronze: 0, total: 0 },
      avg_place: null,
      podium_rate: null,
      win_rate: null,
      penalties: 0,
      dnf: 0,
      dns: 0,
      penalty_rate: 0,
      clean_race_pct: 1.0,
      crashes_inferred: 0,
      crash_rate: 0,
    },
    events: [],
    distances: [],
  };
}

// ── Win Probability Calculator ──
export function computeWinProbability(
  mySkater: Skater,
  lane: number,
  _distance: string,
  opponents: OpponentThreat[],
  matchupInsights: MatchupInsight[],
  laneAdvData: { win_rate?: number; top2_rate?: number } | null,
): WinProbability {
  // 1) Lane base rate (0-100)
  const laneBase = laneAdvData?.win_rate != null
    ? Math.round(laneAdvData.win_rate * 100)
    : 20; // default ~20% if no data

  const laneTop2 = laneAdvData?.top2_rate != null
    ? Math.round(laneAdvData.top2_rate * 100)
    : 40;

  // 2) Strength differential: compare my threat score vs opponents
  const myThreat = mySkater.stats.threat_score ?? 0;
  const myNetPasses = mySkater.stats.net_passes ?? 0;
  const myAvgPasses = mySkater.stats.avg_passes_per_race ?? 0;
  const myMedals = mySkater.stats.medals
    ? (mySkater.stats.medals.gold || 0) * 3 + (mySkater.stats.medals.silver || 0) * 2 + (mySkater.stats.medals.bronze || 0)
    : 0;
  const myRaces = mySkater.stats.total_races || 1;

  // Composite strength score (0-100 scale)
  const myStrength = Math.min(100, Math.max(0,
    myThreat * 0.4 +
    Math.min(30, Math.max(-10, myNetPasses / myRaces * 15)) +
    Math.min(20, myAvgPasses * 5) +
    Math.min(20, myMedals * 2)
  ));

  // When no opponents, we can't calculate a real win probability
  // Instead of defaulting to weak opponents, we'll use the skater's own strength
  // to estimate a "field average" scenario
  let avgOppStrength = myStrength; // Assume average field = similar strength (50/50)
  const hasOpponents = opponents.length > 0;
  
  if (hasOpponents) {
    avgOppStrength = Math.min(100, Math.max(0,
      opponents.reduce((sum, o) => {
        const oppMedals = o.medals_total || 0;
        return sum +
          (o.threat_score || 0) * 0.4 +
          Math.min(30, Math.max(-10, (o.net_passes / Math.max(1, o.total_races)) * 15)) +
          Math.min(20, o.avg_passes_per_race * 5) +
          Math.min(20, oppMedals * 2);
      }, 0) / opponents.length
    ));
  }

  // Strength adjustment: -50 to +50
  const strengthDelta = myStrength - avgOppStrength;
  // Map to -50..+50 range with sigmoid-like curve
  const strengthAdj = Math.round(50 * (2 / (1 + Math.exp(-strengthDelta / 20)) - 1));

  // 3) Style matchup adjustment: -15 to +15
  let matchupAdj = 0;
  if (matchupInsights.length > 0) {
    const totalAdv = matchupInsights.reduce((sum, m) => {
      if (m.advantage) return sum + (m.winRate - 0.5) * 30;
      if (m.disadvantage) return sum + (m.winRate - 0.5) * 30;
      return sum;
    }, 0);
    matchupAdj = Math.round(Math.max(-15, Math.min(15, totalAdv / matchupInsights.length)));
  }

  // Combine: lane base + strength adjustment + matchup adjustment
  const rawWin = laneBase + strengthAdj + matchupAdj;
  const overall = Math.round(Math.max(1, Math.min(99, rawWin)));

  // Podium probability (top 3)
  const rawPodium = laneTop2 + strengthAdj * 0.8 + matchupAdj * 0.5;
  const podium = Math.round(Math.max(2, Math.min(99, rawPodium)));

  // Explanation
  const parts: string[] = [];
  if (!hasOpponents) {
    parts.push(`Lane ${lane} base only (no opponents selected)`);
  } else {
    parts.push(`Lane ${lane} base: ${laneBase}%`);
    if (strengthAdj > 0) parts.push(`Strength edge: +${strengthAdj}%`);
    else if (strengthAdj < 0) parts.push(`Strength gap: ${strengthAdj}%`);
    else parts.push('Strength: even');
    if (matchupAdj > 0) parts.push(`Style matchup: +${matchupAdj}%`);
    else if (matchupAdj < 0) parts.push(`Style matchup: ${matchupAdj}%`);
  }
  const explanation = parts.join(' · ');

  return { overall, laneBase, strengthAdj, matchupAdj, podium, explanation, hasOpponents };
}

// ── Main Strategy Generator ──
export function generateStrategy(
  mySkater: Skater,
  distance: string,
  lane: number,
  opponents: OpponentThreat[],
  models: Models | null
): StrategyResult {
  const strategyData = models?.strategy;
  const totalLaps = TOTAL_LAPS[distance] || 9;
  const style = mySkater.stats.style || 'balanced';

  // Get strategy model data
  const laneAdvData = strategyData?.lane_advantage?.[distance]?.[String(lane)] ?? null;
  const hotspots: HotspotLap[] = strategyData?.hotspot_laps?.[distance] ?? [];
  const hotspotLapNums = new Set(hotspots.map((h) => h.lap));
  const timing = strategyData?.overtake_timing?.[distance] ?? {};
  const styleMatchups = strategyData?.style_matchups ?? {};

  // Sort opponents by threat
  const sortedOpponents = [...opponents].sort(
    (a, b) => b.threat_score - a.threat_score
  );

  // Compute pace
  const pace = computePace(style, distance, lane, sortedOpponents);

  // Build matchup insights
  const matchupInsights = buildMatchupInsights(
    style,
    sortedOpponents,
    styleMatchups as Record<string, Record<string, { win_rate: number; total: number }>>
  );

  // Lane win rate
  const laneWinRate = laneAdvData
    ? Math.round((laneAdvData as { win_rate: number }).win_rate * 100)
    : null;

  // Personalized win probability (computed BEFORE advice so tips use it)
  const winProbability = computeWinProbability(
    mySkater,
    lane,
    distance,
    sortedOpponents,
    matchupInsights,
    laneAdvData as { win_rate?: number; top2_rate?: number } | null,
  );

  // Generate advice (with win probability)
  const advice = generateAdvice(
    style,
    distance,
    lane,
    laneAdvData as { win_rate?: number; sample_size?: number } | null,
    sortedOpponents,
    pace,
    timing as Record<string, { count: number; pct: number }>,
    hotspots,
    matchupInsights,
    winProbability
  );

  // Build lap plan
  const lapPlan = buildLapPlan(totalLaps, hotspotLapNums, pace, style);

  // Build lap overtake data for charts
  const lapOvertakeData = strategyData
    ? buildLapOvertakeData(distance, strategyData, hotspotLapNums, totalLaps)
    : [];

  return {
    mySkaterName: mySkater.name,
    mySkaterFlag: mySkater.flag,
    distance,
    lane,
    totalLaps,
    style,
    pace,
    advice,
    lapPlan,
    opponentThreats: sortedOpponents,
    matchupInsights,
    laneWinRate,
    winProbability,
    lapOvertakeData,
  };
}
