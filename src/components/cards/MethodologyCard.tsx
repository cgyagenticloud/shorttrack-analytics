import { useState } from 'react';

interface MetricDef {
  term: string;
  definition: string;
}

interface Props {
  title?: string;
  intro?: string;
  metrics: MetricDef[];
}

export default function MethodologyCard({ title, intro, metrics }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📖</span>
          <span className="font-bold text-gray-900 text-sm">
            {title ?? 'Methodology & Metric Definitions'}
          </span>
        </div>
        <span className="text-gray-400 text-lg transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }}>
          ▼
        </span>
      </button>

      {open && (
        <div className="px-6 pb-5 space-y-3">
          {intro && (
            <p className="text-sm text-gray-600 leading-relaxed">{intro}</p>
          )}
          <dl className="space-y-2">
            {metrics.map((m) => (
              <div key={m.term} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="text-sm font-semibold text-[#2646A7] shrink-0 sm:w-48">
                  {m.term}
                </dt>
                <dd className="text-sm text-gray-600">{m.definition}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
