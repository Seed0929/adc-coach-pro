/** Public draft documents must not be indexed as final legal policies. */
export function legalHead(title: string, description: string) {
  return { meta: [
    { title: `${title} — Draft — BotDiff` },
    { name: "description", content: description },
    { property: "og:title", content: `${title} — Draft — BotDiff` },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex, nofollow" },
  ] };
}