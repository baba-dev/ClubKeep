"use client";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
export function ClubThemeToggle() {
  const [dark, setDark] = useState(true);
  return (
    <button
      type="button"
      aria-label={dark ? "Use light theme" : "Use dark theme"}
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        window.localStorage.setItem("ck-theme", next ? "dark" : "light");
      }}
      className="grid size-11 place-items-center rounded-xl border border-[#f6dc9b]/20 text-[#f3c28a]"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
