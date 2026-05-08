type Props = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: Props) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((current / total) * 100));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs font-medium text-zinc-500">
        <span>
          {current} / {total}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-zinc-900 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
