export default function KpiCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 text-white',
    green: 'from-emerald-500 to-emerald-700 text-white',
    red: 'from-red-500 to-red-700 text-white',
    amber: 'from-amber-500 to-orange-600 text-white',
    slate: 'from-slate-700 to-slate-900 text-white',
  };
  return (
    <div className="card p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tones[tone]} grid place-items-center text-xl shrink-0`}
      >
        {Icon && <Icon />}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">
          {label}
        </div>
        <div className="text-2xl font-extrabold text-ink truncate">{value}</div>
        {sub && <div className="text-xs text-slate-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}
