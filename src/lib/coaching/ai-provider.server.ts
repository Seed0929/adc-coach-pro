// ---------------------------------------------------------------------------
// OpenAI-backed coaching provider (server-only).
//
// Reads OPENAI_API_KEY at call time. If the key is absent it returns an
// `available: false` provider that never throws — the coaching engine then
// falls back to its deterministic answer. When the key is added later, live AI
// coaching turns on with no other changes.
// ---------------------------------------------------------------------------
import type { CoachAIProvider } from "./ai-provider";
import { unavailableProvider } from "./ai-provider";
import { assemblePrompt, MASTER_COACHING_PROMPT } from "./master-prompt";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const MODEL = "gpt-4o-mini";

/** Resolve the active AI provider for this request. */
export function resolveCoachProvider(): CoachAIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return unavailableProvider;

  return {
    name: "openai",
    available: true,
    async generate(context) {
      try {
        const prompt = assemblePrompt(JSON.stringify(context, null, 2), context.question);
        const res = await fetch(OPENAI_URL, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            temperature: 0.6,
            messages: [
              { role: "system", content: MASTER_COACHING_PROMPT },
              { role: "user", content: prompt },
            ],
          }),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        const text = json.choices?.[0]?.message?.content?.trim();
        return text || null;
      } catch {
        return null;
      }
    },
  };
}