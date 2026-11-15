import { formatMinorMoney } from "@/lib/money-format";

/** Server-rendered per-currency bar charts. Never normalize across currencies. */
export function CollectionsTrend({
  entries,
}: {
  entries: ReadonlyArray<{ month: string; currency: string; amount: number }>;
}) {
  const byCurrency = new Map<string, typeof entries>();
  for (const entry of entries) {
    byCurrency.set(entry.currency, [...(byCurrency.get(entry.currency) ?? []), entry]);
  }
  return (
    <div className="hm-ops-charts mt-6">
      {[...byCurrency.entries()].map(([currency, rows]) => {
        const max = Math.max(1, ...rows.map((row) => Math.abs(row.amount)));
        return (
          <div key={currency} className="hm-ops-chart" aria-label={currency + " monthly collections"}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold">{currency} collections</h3>
              <span className="hm-ops-pill">{rows.length} months</span>
            </div>
            <ol className="space-y-4">
              {rows.slice(-7).map((row) => {
                const percentage = Math.min(100, (Math.abs(row.amount) / max) * 100);
                return (
                  <li key={row.month} className="hm-ops-chart-row">
                    <span className="hm-ops-chart-month">{row.month}</span>
                    <div className="hm-ops-chart-track" aria-hidden="true">
                      <span className="hm-ops-chart-fill" style={{ width: percentage + "%" }} />
                    </div>
                    <span className="hm-ops-chart-amount">{formatMinorMoney(row.amount, currency)}</span>
                  </li>
                );
              })}
            </ol>
            <p className="hm-small mt-5">Net recorded collections. Bars are scaled only within {currency}.</p>
          </div>
        );
      })}
    </div>
  );
}
