/**
 * Exact hosts approved for Stripe TEST checkout. Exact matches only: no
 * wildcards, prefixes or suffixes, so production and custom domains
 * (botdiff.online, www.botdiff.online, botdiffgg.lovable.app) never qualify.
 */
export const TEST_CHECKOUT_HOSTS: ReadonlySet<string> = new Set([
  "localhost:8080",
  "id-preview--78e292a8-9045-4850-a622-8e79115188ed.lovable.app",
  "project--78e292a8-9045-4850-a622-8e79115188ed-dev.lovable.app",
  "preview--botdiffgg.lovable.app",
]);

/** True only for an approved preview origin (https, or local http dev). */
export function isTestCheckoutOrigin(value: string | URL): boolean {
  let url: URL;
  try { url = new URL(value.toString()); } catch { return false; }
  const host = url.host.toLowerCase();
  if (!TEST_CHECKOUT_HOSTS.has(host)) return false;
  if (host === "localhost:8080") return url.protocol === "http:";
  return url.protocol === "https:";
}
