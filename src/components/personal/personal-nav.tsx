"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Dumbbell, LineChart, Sun, UserRound } from "lucide-react";

const TABS = [
  { href: "/me", label: "Today", Icon: Sun },
  { href: "/me/body", label: "Body", Icon: Dumbbell },
  { href: "/me/activity", label: "Activity", Icon: Activity },
  { href: "/me/progress", label: "Progress", Icon: LineChart },
  { href: "/me/profile", label: "Profile", Icon: UserRound },
] as const;

export function PersonalNav() {
  const path = usePathname();
  return (
    <nav className="hm-me-tabs print:hidden" aria-label="Personal">
      {TABS.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          className="hm-me-tab"
          aria-current={path === href ? "page" : undefined}
        >
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
