import { useEffect, useMemo, useRef, useState } from "react";
import { useRiotAssets } from "@/hooks/use-riot-assets";

/**
 * Premium champion splash backdrop — Apple-wallpaper feel, never a gaming site.
 *
 * The splash art is heavily blurred, darkened and gradient-masked so glass
 * cards and text always stay the primary focus. Images lazy-load and fade in,
 * so there is no layout shift and a graceful fallback if an asset is missing.
 *
 * Pass a single champion for a static backdrop, or 2-3 champions to slowly and
 * elegantly cross-fade between them (used on the profile page).
 */
export function ChampionBackdrop({
  champions,
  intervalMs = 9000,
  intensity = "subtle",
}: {
  champions: string | string[];
  intervalMs?: number;
  intensity?: "subtle" | "medium";
}) {
  const { assets, ready } = useRiotAssets();
  const list = useMemo(
    () => (Array.isArray(champions) ? champions : [champions]).filter(Boolean),
    [champions],
  );
  const [active, setActive] = useState(0);

  // Slow, elegant rotation between the provided champions.
  useEffect(() => {
    if (list.length < 2) return;
    const id = setInterval(() => setActive((i) => (i + 1) % list.length), intervalMs);
    return () => clearInterval(id);
  }, [list.length, intervalMs]);

  if (!list.length) return null;
  // `ready` gates URL building so champion names resolve to real DDragon ids.
  const opacity = intensity === "medium" ? "opacity-[0.28]" : "opacity-[0.18]";

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]">
      {ready &&
        list.map((champ, i) => (
          <LazySplash
            key={champ + i}
            src={assets.championSplash(champ)}
            visible={i === active}
            opacityClass={opacity}
          />
        ))}
      {/* Darkening + readability gradients layered above the art. */}
      <div className="absolute inset-0 bg-background/70" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/60 to-transparent" />
    </div>
  );
}

function LazySplash({
  src,
  visible,
  opacityClass,
}: {
  src: string;
  visible: boolean;
  opacityClass: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <img
      ref={ref}
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setLoaded(false)}
      className={`absolute inset-0 size-full scale-110 object-cover blur-2xl saturate-[1.15] transition-opacity duration-[2000ms] ease-in-out ${
        visible && loaded ? opacityClass : "opacity-0"
      }`}
    />
  );
}
