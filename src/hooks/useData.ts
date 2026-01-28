import { useState, useEffect, useCallback } from 'react';
import type { Manifest, Skater, Event, Heat, PassEvent, Models, Incident, CrashEvent, MedalRecord } from '../types/data';

interface TimeTrendEntry {
  distance: number;
  time: number;
  time_str: string;
  competition: string;
  date: string | null;
  place: number | null;
  source: 'uss' | 'stl';
}

interface TimeTrendsData {
  generated: string;
  total_skaters: number;
  trends: Record<string, Record<number, TimeTrendEntry[]>>;
}

interface AppData {
  manifest: Manifest | null;
  skaters: Skater[];
  events: Event[];
  heats: Heat[];
  passes: PassEvent[];
  models: Models | null;
  incidents: Incident[];
  crashes: CrashEvent[];
  medals: MedalRecord[];
  timeTrends: TimeTrendsData | null;
  loading: boolean;
  error: string | null;
}

const initialState: AppData = {
  manifest: null,
  skaters: [],
  events: [],
  heats: [],
  passes: [],
  models: null,
  incidents: [],
  crashes: [],
  medals: [],
  timeTrends: null,
  loading: true,
  error: null,
};

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export function useData() {
  const [data, setData] = useState<AppData>(initialState);

  const loadData = useCallback(async () => {
    setData(prev => ({ ...prev, loading: true, error: null }));
    try {
      const [manifest, skaters, events, heats, passes, models, incidents, crashes, medals, timeTrends] = await Promise.all([
        fetchJSON<Manifest>('/data/manifest.json'),
        fetchJSON<Skater[]>('/data/skaters.json'),
        fetchJSON<Event[]>('/data/events.json'),
        fetchJSON<Heat[]>('/data/heats.json').catch(() => [] as Heat[]),
        fetchJSON<PassEvent[]>('/data/passes.json').catch(() => [] as PassEvent[]),
        fetchJSON<Models>('/data/models.json').catch(() => null),
        fetchJSON<Incident[]>('/data/incidents.json').catch(() => [] as Incident[]),
        fetchJSON<CrashEvent[]>('/data/crashes.json').catch(() => [] as CrashEvent[]),
        fetchJSON<MedalRecord[]>('/data/medals.json').catch(() => [] as MedalRecord[]),
        fetchJSON<TimeTrendsData>('/data/skater_time_trends.json').catch(() => null),
      ]);
      setData({ manifest, skaters, events, heats, passes, models, incidents, crashes, medals, timeTrends, loading: false, error: null });
    } catch (err) {
      setData(prev => ({ ...prev, loading: false, error: (err as Error).message }));
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return data;
}
