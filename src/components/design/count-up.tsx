"use client";

import { useEffect, useRef, useState } from "react";

type Props = { to: number; prefix?: string; className?: string };

const fmt = new Intl.NumberFormat("en-IN");

export function CountUp({ to, prefix = "", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(to);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const run = (now: number) => {
          const p = Math.min(1, (now - start) / 1400);
          setValue(Math.round(to * (1 - Math.pow(1 - p, 4))));
          if (p < 1) raf = requestAnimationFrame(run);
        };
        setValue(0);
        raf = requestAnimationFrame(run);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {fmt.format(value)}
    </span>
  );
}
