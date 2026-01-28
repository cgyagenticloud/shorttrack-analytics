import type { Gender } from '../../types/data';

interface FilterBarProps {
  gender: Gender | 'all';
  distance: number | 'all';
  onGenderChange: (g: Gender | 'all') => void;
  onDistanceChange: (d: number | 'all') => void;
  nationalities?: string[];
  nationality?: string | 'all';
  onNationalityChange?: (n: string | 'all') => void;
}

const genderOptions: { value: Gender | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'Men', label: 'Men' },
  { value: 'Women', label: 'Women' },
];

const distanceOptions: { value: number | 'all'; label: string }[] = [
  { value: 'all', label: 'All Distances' },
  { value: 500, label: '500m' },
  { value: 1000, label: '1000m' },
  { value: 1500, label: '1500m' },
];

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? 'bg-[#2646A7] text-white'
          : 'bg-white text-gray-600 border border-gray-200 hover:border-[#2646A7] hover:text-[#2646A7]'
      }`}
    >
      {children}
    </button>
  );
}

export default function FilterBar({
  gender,
  distance,
  onGenderChange,
  onDistanceChange,
  nationalities,
  nationality,
  onNationalityChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Gender pills */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Gender</span>
        {genderOptions.map((o) => (
          <Pill key={o.value} active={gender === o.value} onClick={() => onGenderChange(o.value)}>
            {o.label}
          </Pill>
        ))}
      </div>

      {/* Distance pills */}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Distance</span>
        {distanceOptions.map((o) => (
          <Pill
            key={String(o.value)}
            active={distance === o.value}
            onClick={() => onDistanceChange(o.value)}
          >
            {o.label}
          </Pill>
        ))}
      </div>

      {/* Nationality dropdown */}
      {nationalities && onNationalityChange && (
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-500 uppercase mr-1">Country</span>
          <select
            value={nationality ?? 'all'}
            onChange={(e) => onNationalityChange(e.target.value === 'all' ? 'all' : e.target.value)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2646A7]/30 focus:border-[#2646A7]"
          >
            <option value="all">All Countries</option>
            {nationalities.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
