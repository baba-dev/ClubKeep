import type { CSSProperties, HTMLAttributes } from "react";
import "./AchievementArt.css";

export const achievementNames = [
  "achievement-medal",
  "milestone-badge",
  "challenge-trophy",
  "streak-badge",
] as const;

export type AchievementName = (typeof achievementNames)[number];
export type AchievementTheme = "auto" | "light" | "dark";

export interface AchievementArtProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children" | "title"> {
  name: AchievementName;
  theme?: AchievementTheme;
  /** CSS length or pixel dimension, default 96. */
  size?: CSSProperties["width"];
  /** Supply a label only if the illustration conveys information not nearby in text. */
  title?: string;
  animated?: boolean;
  /** Optional URL prefix for deployments with a basePath, no trailing slash. */
  assetBasePath?: string;
}

/**
 * Original standalone SVGs are displayed for exact gradient fidelity.
 * A consolidated editable SVG atlas is provided separately in achievement-sprite.svg.
 * Avoid external <use> here: Chromium may resolve gradients as black inside
 * externally loaded symbol sprites, losing the approved artwork colours.
 */
export function AchievementArt({
  name,
  theme = "auto",
  size = 96,
  title,
  animated = false,
  assetBasePath = "",
  className = "",
  style,
  ...rest
}: AchievementArtProps) {
  const cssSize = typeof size === "number" ? `${size}px` : size;
  const directory = `${assetBasePath}/media/human-motion/achievements/individual`;
  const image = (mode: "light" | "dark") => (
    <img
      className={`ck-achievement__${mode}`}
      src={`${directory}/${name}-${mode}.svg`}
      alt=""
      width={typeof size === "number" ? size : undefined}
      height={typeof size === "number" ? size : undefined}
      aria-hidden="true"
      draggable={false}
    />
  );

  return (
    <span
      {...rest}
      className={`ck-achievement ck-achievement--${theme}${animated ? " ck-achievement--animated" : ""}${className ? ` ${className}` : ""}`}
      role={title ? "img" : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
      style={{ width: cssSize, height: cssSize, flexShrink: 0, ...style }}
    >
      {theme !== "dark" && image("light")}
      {theme !== "light" && image("dark")}
    </span>
  );
}
