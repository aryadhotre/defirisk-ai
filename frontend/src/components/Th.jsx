export default function Th({ children, className = "" }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {children}
    </th>
  );
}
