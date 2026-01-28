export default function About() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          ℹ️ About This Project
        </h1>
        <p className="text-gray-500 mt-1">How and why this was built.</p>
      </div>

      {/* Project Overview */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          🎯 Project Overview
        </h2>
        <p className="text-gray-700 leading-relaxed">
          ShortTrack Analytics is a data-driven tool for short track speed
          skating competitors and coaches. It analyzes overtaking patterns,
          predicts race outcomes, and generates pre-race strategies using real
          competition data.
        </p>
      </div>

      {/* Data Sources */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          📂 Data Sources
        </h2>
        <div className="space-y-3">
          {[
            {
              name: 'ISU World Tour 2025-2026 (Senior)',
              desc: 'World Tours, 229+ skaters',
              emoji: '🌍',
            },
            {
              name: 'ISU Junior World Cup 2025-2026',
              desc: 'Junior circuit',
              emoji: '🏆',
            },
            {
              name: 'shorttrackonline.info',
              desc: 'European youth (Junior C/D) data',
              emoji: '🇪🇺',
            },
            {
              name: 'shorttracklive.info',
              desc: 'US youth data',
              emoji: '🇺🇸',
            },
          ].map((src) => (
            <div
              key={src.name}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50"
            >
              <span className="text-xl shrink-0">{src.emoji}</span>
              <div>
                <div className="font-semibold text-gray-900 text-sm">
                  {src.name}
                </div>
                <div className="text-xs text-gray-500">{src.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Data Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          🔧 Data Pipeline
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
          {[
            'Raw results',
            'Python extraction (overtake detection via position changes)',
            'Statistical models (GradientBoosting)',
            'JSON',
            'React dashboard',
          ].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#2646A7]/10 text-[#2646A7] font-medium text-xs">
                {step}
              </span>
              {i < arr.length - 1 && (
                <span className="text-gray-400 font-bold">→</span>
              )}
            </span>
          ))}
        </div>
      </div>

      {/* Models */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">🤖 Models</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Overtake Prediction',
              desc: 'What factors make a skater more likely to overtake?',
              color: 'bg-[#2646A7]',
              emoji: '⚡',
            },
            {
              title: 'Medal Prediction',
              desc: 'Which race stats predict medal finishes?',
              color: 'bg-[#D97706]',
              emoji: '🏅',
            },
            {
              title: 'Strategy Engine',
              desc: 'Generates personalized race strategies based on opponent analysis.',
              color: 'bg-[#059669]',
              emoji: '🧠',
            },
          ].map((model) => (
            <div
              key={model.title}
              className="rounded-xl border border-gray-200 p-5 hover:border-[#2646A7] transition-colors"
            >
              <div
                className={`w-10 h-10 ${model.color} rounded-lg flex items-center justify-center text-white text-lg mb-3`}
              >
                {model.emoji}
              </div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">
                {model.title}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {model.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          🛠️ Tech Stack
        </h2>
        <div className="flex flex-wrap gap-2">
          {[
            'React 19',
            'TypeScript',
            'Tailwind CSS',
            'Recharts',
            'Vite',
            'Cloudflare Pages',
            'Python (scikit-learn)',
          ].map((tech) => (
            <span
              key={tech}
              className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-700"
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* Builder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">👤 Builder</h2>
        <p className="text-gray-700 leading-relaxed">
          Built by Daniel Chen — a competitive short track speed skater who
          wanted to understand the sport through data.
        </p>
      </div>

      {/* Footer note */}
      <div className="text-center text-gray-400 text-sm py-4">
        Data: ISU World Tour &amp; Junior World Cup 2025-2026 season
      </div>
    </div>
  );
}
