// Server-rendered, dependency-free charts. Every chart exposes its numbers as
// text (list or sr-only summary) so it is readable without sight or CSS.

export function DailyColumns({
  days,
  label,
}: {
  days: ReadonlyArray<{ key: string; value: number }>;
  label: string;
}) {
  const max = Math.max(1, ...days.map((day) => day.value));
  const total = days.reduce((sum, day) => sum + day.value, 0);
  return (
    <figure>
      <div
        role="img"
        aria-label={`${label}: ${total} total over ${days.length} days. Busiest day ${max} visits.`}
        className="flex h-32 items-end gap-[3px]"
      >
        {days.map((day) => (
          <span
            key={day.key}
            title={`${day.key}: ${day.value}`}
            className="min-h-[2px] flex-1 rounded-t-sm bg-[var(--hm-sage-deep)]"
            style={{
              height: Math.max(2, (day.value / max) * 100) + "%",
              opacity: day.value ? 1 : 0.25,
            }}
          />
        ))}
      </div>
      <figcaption className="hm-small mt-2 flex justify-between">
        <span>{days[0]?.key}</span>
        <span>{days[days.length - 1]?.key}</span>
      </figcaption>
    </figure>
  );
}

export function BarRows({
  rows,
  emptyText,
}: {
  rows: ReadonlyArray<{ label: string; value: number }>;
  emptyText: string;
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  if (rows.length === 0 || rows.every((row) => row.value === 0)) {
    return <p className="hm-small mt-4">{emptyText}</p>;
  }
  return (
    <ol className="mt-4 space-y-3">
      {rows.map((row) => (
        <li key={row.label} className="hm-ops-chart-row">
          <span className="hm-ops-chart-month">{row.label}</span>
          <div className="hm-ops-chart-track" aria-hidden="true">
            <span className="hm-ops-chart-fill" style={{ width: (row.value / max) * 100 + "%" }} />
          </div>
          <span className="hm-ops-chart-amount">{row.value.toLocaleString("en-IN")}</span>
        </li>
      ))}
    </ol>
  );
}
