import type { Metadata } from "next";
import { designFontVars } from "@/components/design/fonts";
import { themeCss } from "@/components/design/themes";
import "./designs.css";

export const metadata: Metadata = {
  title: "ClubKeep design directions",
  description:
    "Six design-token and motion directions for ClubKeep, each with light and dark modes.",
  robots: { index: false },
};

// Runs before first paint so the saved (or system) mode is applied without a flash.
const initTheme = `try{var s=localStorage.getItem("ck-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}`;

export default function DesignLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${designFontVars} dk-shell`}>
      <script dangerouslySetInnerHTML={{ __html: initTheme }} />
      <style dangerouslySetInnerHTML={{ __html: themeCss() }} />
      {children}
    </div>
  );
}
