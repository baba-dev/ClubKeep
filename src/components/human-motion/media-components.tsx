import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { HM_MEDIA, type ThemePair } from "./media";

export function imageVars(pair: ThemePair): CSSProperties {
  return {
    "--hm-image-light": "url('" + pair.light + "')",
    "--hm-image-dark": "url('" + pair.dark + "')",
  } as CSSProperties;
}

export function ThemeArtwork({
  pair,
  className = "hm-gallery-art",
}: {
  pair: ThemePair;
  className?: string;
}) {
  return <span aria-hidden="true" className={className} style={imageVars(pair)} />;
}

export function ClubKeepBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/home" aria-label="ClubKeep home" className="hm-brand">
      {compact ? (
        <Image src={HM_MEDIA.branding.icon} alt="" width={43} height={43} unoptimized className="hm-brand-icon" />
      ) : (
        <>
          <Image
            src={HM_MEDIA.branding.primary.light}
            alt="ClubKeep by BabaBuilds"
            width={170}
            height={51}
            unoptimized
            className="hm-brand-image hm-brand-image-light"
          />
          <Image
            src={HM_MEDIA.branding.primary.dark}
            alt=""
            width={170}
            height={51}
            unoptimized
            className="hm-brand-image hm-brand-image-dark"
          />
        </>
      )}
    </Link>
  );
}
