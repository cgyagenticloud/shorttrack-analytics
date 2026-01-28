interface KPICardProps {
  value: number | string;
  label: string;
}

export default function KPICard({ value, label }: KPICardProps) {
  const formatted =
    typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-center hover:border-[#2646A7] hover:-translate-y-0.5 transition-all cursor-default">
      <div className="text-[2rem] font-extrabold text-[#2646A7] leading-tight">
        {formatted}
      </div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
        {label}
      </div>
    </div>
  );
}
