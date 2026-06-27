export default function Td({ children, className = "" }) {
  return (
    <td className={`px-4 py-3 align-middle text-white/80 ${className}`}>
      {children}
    </td>
  );
}
