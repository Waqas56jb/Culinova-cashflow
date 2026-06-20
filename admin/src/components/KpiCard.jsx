export default function KpiCard({ icon: Icon, label, value, sub, tone = 'brand' }) {
  const tones = {
    brand: 'from-brand-500 to-brand-700 text-white',
    green: 'from-emerald-500 to-emerald-700 text-white',
    red: 'from-red-500 to-red-700 text-white',
    amber: 'from-amber-500 to-orange-600 text-white',
    slate: 'from-slate-700 to-slate-900 text-white',
  };
  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3 min-h-[128px]">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tones[tone]} grid place-items-center text-lg shrink-0`}
        >
          {Icon && <Icon />}
        </div>
        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-snug">
          {label}
        </div>
      </div>
      <div className="mt-auto">
        <div className="text-xl sm:text-2xl font-extrabold text-ink leading-tight break-words tabular-nums">
          {value}
        </div>
        {sub && <div className="text-[11px] text-slate-400 mt-1 leading-tight break-words">{sub}</div>}
      </div>
    </div>
  );
}
