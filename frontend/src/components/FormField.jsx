export default function FormField({
  label,
  type = "text",
  placeholder,
  value,
  onChange,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-white/50">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full rounded-xl px-4 py-3 bg-black/20 border border-white/10 
                   focus:border-indigo-400/40 outline-none transition-all"
        required
      />
    </div>
  );
}
