import { Link } from "@tanstack/react-router";

export const RIOT_DISCLAIMER =
  "BotDiff isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Riot Games and all associated properties are trademarks or registered trademarks of Riot Games, Inc.";

/**
 * Shared footer for public surfaces (home, pricing, sign in). Carries the full
 * Riot Games legal disclaimer plus the standard public navigation links.
 */
export function PublicFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`mx-auto max-w-5xl px-5 pb-10 text-xs text-muted-foreground ${className}`}>
      <div className="space-y-4 border-t border-white/[0.06] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} BotDiff — personal League of Legends coaching.</span>
          <nav className="flex flex-wrap items-center gap-4">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <Link to="/pricing" className="transition-colors hover:text-foreground">
              Pricing
            </Link>
            <Link to="/auth" className="transition-colors hover:text-foreground">
              Sign In
            </Link>
          </nav>
        </div>
        <p className="max-w-4xl leading-relaxed text-muted-foreground/80">{RIOT_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
