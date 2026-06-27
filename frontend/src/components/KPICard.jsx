export default function KPICard({ title, icon, value }) {
  return (
    <div className="rounded-2xl p-5 bg-white/5 border border-white/10 
                    backdrop-blur-xl shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-white/60">
          {title}
        </span>
        {icon}
      </div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
    </div>
  );
}
