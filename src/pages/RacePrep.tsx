import { useState, useRef, useCallback } from 'react';
import type { Skater, Models, Category } from '../types/data';
import HeatSetup from '../components/forms/HeatSetup';
import MethodologyCard from '../components/cards/MethodologyCard';
import type { HeatSetupData } from '../components/forms/HeatSetup';
import StrategyOutput from '../components/strategy/StrategyOutput';
import { generateStrategy } from '../lib/strategy';
import type { StrategyResult } from '../lib/strategy';

interface Props {
  skaters: Skater[];
  models: Models | null;
  category: Category | 'all';
}

export default function RacePrep({ skaters, models, category }: Props) {
  const [result, setResult] = useState<StrategyResult | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Filter skaters by category if not 'all'
  const filteredSkaters =
    category === 'all'
      ? skaters
      : skaters.filter((s) => s.category === category);

  const handleGenerate = useCallback(
    (data: HeatSetupData) => {
      const stratResult = generateStrategy(
        data.mySkater,
        data.distance,
        data.lane,
        data.opponents,
        models
      );
      setResult(stratResult);

      // Scroll to output after a tick
      setTimeout(() => {
        outputRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 100);
    },
    [models]
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">🎯 Race Prep</h1>
        <p className="text-gray-500 mt-1">
          Set up your next race and get a winning strategy.
        </p>
      </div>

      {/* Methodology */}
      <MethodologyCard
        title="Race Prep — Methodology & Metrics"
        intro="The Strategy Optimizer analyzes 1,212 historical heats to generate personalized race plans. It combines lane advantage data, overtake timing hotspots, style matchups, and per-skater threat scores."
        metrics={[
          { term: 'Lane Advantage', definition: 'Win rate by starting lane position, computed from all heats at the selected distance. Inside lanes generally have shorter paths but more traffic.' },
          { term: 'Threat Score', definition: 'Composite 0–100 score reflecting a skater\'s overtake frequency, net passes per race, and finals appearance rate. Higher = more dangerous opponent.' },
          { term: 'Style Matchup', definition: 'Win probability when your style faces an opponent\'s style (e.g. Late Mover vs Front Runner), based on historical head-to-head outcomes.' },
          { term: 'Overtake Hotspots', definition: 'Laps where overtakes are most frequent at each distance, broken into early / middle / late race phases.' },
          { term: 'Pace Profile', definition: 'Recommended lap-by-lap effort distribution based on the distance and opponent mix — conservative, aggressive, or balanced.' },
          { term: 'Strategy Suggestions', definition: 'Six tactical tips derived from your lane, opponents\' weaknesses, and historical patterns at this distance.' },
        ]}
      />

      {/* Setup form */}
      <HeatSetup skaters={filteredSkaters} onGenerate={handleGenerate} />

      {/* Strategy output */}
      {result && (
        <div ref={outputRef}>
          <StrategyOutput result={result} />
        </div>
      )}
    </div>
  );
}
