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
        <nav aria-label="Legal information" className="flex flex-wrap gap-x-5 gap-y-3 leading-relaxed">
          <Link to="/privacy" className="underline underline-offset-4 hover:text-foreground">Privacy</Link>
          <Link to="/terms" className="underline underline-offset-4 hover:text-foreground">Terms</Link>
          <Link to="/cookies" className="underline underline-offset-4 hover:text-foreground">Cookies & storage</Link>
          <Link to="/refunds" className="underline underline-offset-4 hover:text-foreground">Billing & refunds</Link>
          <Link to="/disclaimer" className="underline underline-offset-4 hover:text-foreground">Disclaimer</Link>
          <Link to="/data-deletion" className="underline underline-offset-4 hover:text-foreground">Data deletion</Link>
          <Link to="/affiliate-terms" className="underline underline-offset-4 hover:text-foreground">Affiliate terms</Link>
        </nav>
        <p className="max-w-4xl leading-relaxed text-muted-foreground/80">{RIOT_DISCLAIMER}</p>
      </div>
    </footer>
  );
}
