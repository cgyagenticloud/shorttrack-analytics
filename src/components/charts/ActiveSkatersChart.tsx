import { useState, useEffect, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts';
import type { Category, Gender } from '../../types/data';

interface SkaterEntry {
  skater_id: number;
  gender: string | null;
  age_category: string;
  country: string;
  matched_id: string;
}

interface SeasonRaw {
  season: string;
  competitions: number;
  skaters: SkaterEntry[];
}

// Map scraped age_category → app category
function mapCategory(ageCat: string): Category | null {
  const lower = ageCat.toLowerCase().trim();
  if (lower === 'senior') return 'senior';
  if (lower === 'junior a') return 'youth_ja';
  if (lower === 'junior b') return 'youth_jb';
  if (lower === 'junior c') return 'youth_jc';
  if (lower === 'junior d') return 'youth_jd';
  if (lower === 'junior e') return 'youth_je';
  if (lower === 'junior f') return 'youth_jf';
  if (lower === 'junior g') return 'youth_jg';
  return null;
}

function mapGender(g: string | null): Gender | null {
  if (!g) return null;
  if (g === 'Men') return 'Men';
  if (g === 'Women') return 'Women';
  return null;
}

interface Props {
  category: Category | 'all';
  gender: Gender | 'all';
}

export default function ActiveSkatersChart({ category, gender }: Props) {
  const [raw, setRaw] = useState<SeasonRaw[]>([]);

  useEffect(() => {
    fetch('/data/active_skaters_by_season.json')
      .then((r) => r.json())
      .then((d: SeasonRaw[]) => setRaw(d))
      .catch(() => setRaw([]));
  }, []);

  const data = useMemo(() => {
    return raw.map((s) => {
      let filtered = s.skaters;

      if (category !== 'all') {
        filtered = filtered.filter((sk) => mapCategory(sk.age_category) === category);
      }

      if (gender !== 'all') {
        filtered = filtered.filter((sk) => mapGender(sk.gender) === gender);
      }

      return {
        season: s.season,
        active_skaters: filtered.length,
        competitions: s.competitions,
      };
    });
  }, [raw, category, gender]);

  if (raw.length === 0) return null;

  const COLORS = ['#6366F1', '#8B5CF6', '#A78BFA', '#2646A7'];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-6">
      <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-1">
        ⛸️ Active Skaters by Season
      </h2>
      <p className="text-gray-500 text-xs sm:text-sm mb-3 sm:mb-4">
        Unique skaters who competed per season (US youth data).
      </p>
      <div style={{ height: 280 }} className="sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 5, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="season" tick={{ fontSize: 13, fontWeight: 600 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { season: string; active_skaters: number; competitions: number };
                return (
                  <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                    <p className="font-bold text-gray-900">Season {label}</p>
                    <p className="text-indigo-600">{d.active_skaters} skaters</p>
                    <p className="text-gray-500">{d.competitions} competitions</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="active_skaters" name="Active Skaters" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
              <LabelList dataKey="active_skaters" position="top" style={{ fontSize: 13, fontWeight: 700, fill: '#374151' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
