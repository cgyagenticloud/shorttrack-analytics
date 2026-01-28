import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { Skater } from '../../types/data';

interface Props {
  skaters: Skater[];
  distance: '500' | '1000' | '1500';
}

const COLORS = ['#2646A7', '#4F6DC9', '#7A91DB', '#A5B5ED', '#D0DAFF'];

// Format time from seconds to mm:ss.xx or ss.xx
function formatTime(seconds: number): string {
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${mins}:${secs}`;
  }
  return seconds.toFixed(2);
}

// Parse time string like "42.084" or "1:42.084" to seconds
function parseTime(timeStr: string): number | null {
  if (!timeStr || timeStr === '—') return null;
  try {
    if (timeStr.includes(':')) {
      const [mins, secs] = timeStr.split(':');
      return parseFloat(mins) * 60 + parseFloat(secs);
    }
    return parseFloat(timeStr);
  } catch {
    return null;
  }
}

export default function PBDistributionChart({ skaters, distance }: Props) {
  const data = useMemo(() => {
    // Get PBs for the selected distance
    const pbs: number[] = [];
    
    for (const s of skaters) {
      const pb = s.personal_bests?.[distance];
      if (pb) {
        const time = typeof pb === 'string' ? parseTime(pb) : pb;
        if (time && time > 0 && time < 600) { // Sanity check
          pbs.push(time);
        }
      }
    }

    if (pbs.length === 0) return [];

    // Create histogram bins
    const min = Math.floor(Math.min(...pbs));
    const max = Math.ceil(Math.max(...pbs));
    const binSize = distance === '500' ? 2 : distance === '1000' ? 5 : 10;
    const bins: { range: string; count: number; start: number }[] = [];

    for (let start = Math.floor(min / binSize) * binSize; start <= max; start += binSize) {
      const end = start + binSize;
      const count = pbs.filter(t => t >= start && t < end).length;
      if (count > 0) {
        bins.push({
          range: `${formatTime(start)}-${formatTime(end)}`,
          count,
          start,
        });
      }
    }

    return bins;
  }, [skaters, distance]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h2 className="text-lg font-extrabold text-gray-900 mb-3">
          🏆 {distance}m PB Distribution
        </h2>
        <p className="text-gray-500 text-sm">No PB data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <h2 className="text-lg font-extrabold text-gray-900 mb-3">
        🏆 {distance}m PB Distribution
      </h2>
      <p className="text-gray-500 text-xs mb-3">
        {skaters.filter(s => s.personal_bests?.[distance]).length} skaters with {distance}m PBs
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <XAxis 
            dataKey="range" 
            tick={{ fontSize: 10 }} 
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tick={{ fontSize: 10 }} width={30} />
          <Tooltip 
            formatter={(value) => [`${value} skaters`, 'Count']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
