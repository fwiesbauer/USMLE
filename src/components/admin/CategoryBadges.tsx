const COLORS: Record<string, string> = {
  organ: 'bg-blue-50 text-blue-700',
  task: 'bg-amber-50 text-amber-700',
  discipline: 'bg-purple-50 text-purple-700',
};

export function CategoryBadges({
  items,
  type,
  max = 3,
}: {
  items: string[];
  type: 'organ' | 'task' | 'discipline';
  max?: number;
}) {
  if (!items || items.length === 0) return <span className="text-gray-300">—</span>;

  const shown = items.slice(0, max);
  const rest = items.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((item) => (
        <span
          key={item}
          className={`inline-block text-[11px] px-1.5 py-0.5 rounded ${COLORS[type]}`}
        >
          {item}
        </span>
      ))}
      {rest > 0 && (
        <span className="text-[11px] text-gray-400">+{rest}</span>
      )}
    </div>
  );
}
