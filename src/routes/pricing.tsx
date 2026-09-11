import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { LogIn, ArrowRight } from "lucide-react";
import { PricingSection } from "@/components/pricing/pricing-plans";
import { trackBetaEvent, BETA_EVENTS } from "@/lib/analytics/beta-analytics";
import logoLockup from "@/assets/botdiff-lockup.png";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — BotDiff Free & BotDiff Pro" },
      {
        name: "description",
        content:
          "BotDiff Free includes 3 personalized coaching reports every week. BotDiff Pro adds unlimited coaching, cross-match patterns and long-term progression.",
      },
      { property: "og:title", content: "BotDiff Pricing — Free and Pro" },
      {
        property: "og:description",
        content:
          "Start improving for free. BotDiff Pro is $9.99/month or $79.99/year for continuous personal coaching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  useEffect(() => {
    trackBetaEvent(BETA_EVENTS.pricingViewed, { surface: "pricing" });
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans text-foreground selection:bg-primary/30">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 size-[40rem] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute -right-52 top-1/3 size-[34rem] rounded-full bg-primary/10 blur-[150px]" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5">
          <Link to="/" className="flex items-center">
            <img src={logoLockup} alt="BotDiff" className="h-8 w-auto object-contain object-left" />
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium transition-colors hover:bg-white/[0.07]"
            >
              <LogIn className="size-4" /> Sign In
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Start Free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <PricingSection
          freeCta={
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-6 py-3.5 text-sm font-semibold transition-colors hover:bg-white/[0.09]"
            >
              Start Free <ArrowRight className="size-4" />
            </Link>
          }
        />
      </main>

      <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-6">
          <span>© {new Date().getFullYear()} BotDiff — personal League of Legends coaching.</span>
          <span>BotDiff is not endorsed by Riot Games.</span>
        </div>
      </footer>
    </div>
  );
}
