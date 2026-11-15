import Link from "next/link";
import { UsersRound, CalendarCheck2, Layers3, WalletCards, ArrowUpRight } from "lucide-react";
import { formatMinorMoney } from "@/lib/money-format";
import { HM_MEDIA } from "./media";
import { ThemeArtwork } from "./media-components";
import type { OwnerOverviewSnapshot } from "@/lib/owner-dashboard";

export function OwnerMetrics({
  clubId,
  snapshot,
  showFinance,
}: {
  clubId: string;
  snapshot: OwnerOverviewSnapshot;
  showFinance: boolean;
}) {
  const base = "/clubs/" + encodeURIComponent(clubId);
  const revenue = snapshot.revenue;
  const singleCurrency = revenue.length === 1 && revenue[0].amountMinor !== null;
  const collected = singleCurrency
    ? formatMinorMoney(revenue[0].amountMinor!, revenue[0].currency)
    : revenue.length > 1 ? "By currency" : revenue.length ? "See ledger" : "—";
  const entries = [
    { name: "Total members", value: snapshot.members.toLocaleString(), note: "Active member records", icon: UsersRound, href: base + "/members", wave: HM_MEDIA.illustrations.metrics.members },
    { name: "Today's attendance", value: snapshot.attendanceToday.toLocaleString(), note: "Arrivals on the club-local day", icon: CalendarCheck2, href: base + "/attendance", wave: HM_MEDIA.illustrations.metrics.attendance },
    { name: "Active memberships", value: snapshot.activeMemberships.toLocaleString(), note: "Distinct members with a current plan", icon: Layers3, href: base + "/plans", wave: HM_MEDIA.illustrations.metrics.memberships },
    ...(showFinance ? [{
      name: "Monthly revenue",
      value: collected,
      note: revenue.length > 1
        ? revenue.map((row) => row.currency + ": " + (row.amountMinor === null ? "See ledger" : formatMinorMoney(row.amountMinor, row.currency))).join(" · ")
        : revenue.length === 0 ? "No collections this month" : "Collected this month, excluding reversals",
      icon: WalletCards,
      href: base + "/finance",
      wave: HM_MEDIA.illustrations.metrics.revenue,
    }] : []),
  ];
  return (
    <section aria-label="Club performance" className="hm-metrics">
      {entries.map(({name, value, note, icon: Icon, href, wave}) => (
        <Link href={href} key={name} className="hm-metric hm-surface group">
          <ThemeArtwork pair={wave} className="hm-metric-art" />
          <div className="hm-metric-heading">
            <span>{name}</span>
            <span className="hm-metric-icon"><Icon aria-hidden="true" className="size-4" /></span>
          </div>
          <p className="hm-metric-value">{value}</p>
          <p className="hm-metric-note">{note}</p>
          <ArrowUpRight className="absolute right-5 bottom-4 size-4 opacity-0 transition-opacity group-hover:opacity-80" aria-hidden="true" />
        </Link>
      ))}
    </section>
  );
}
