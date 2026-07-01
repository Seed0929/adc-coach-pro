import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { AppShell, DemoModeBadge } from "@/components/app-shell";
import { useBotDiffData, type CoachMessage } from "@/lib/player-data";

export const Route = createFileRoute("/coach")({
  head: () => ({
    meta: [
      { title: "AI Coach — BotDiff" },
      {
        name: "description",
        content:
          "Talk to your BotDiff AI coach. Ask why you're losing lane, what to practice today, or for a review of your last game.",
      },
      { property: "og:title", content: "AI Coach — BotDiff" },
      {
        property: "og:description",
        content: "A conversation with a Challenger-level AI coach about your own games.",
      },
    ],
  }),
  component: Coach,
});

function Coach() {
  const { isDemo, data } = useBotDiffData();
  const [messages, setMessages] = useState<CoachMessage[]>(data.coachSeed);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setMessages((m) => [
      ...m,
      { role: "you", text: t },
      {
        role: "coach",
        text: isDemo
          ? "This is a sample conversation. Once you connect your Riot account, I'll answer using your own game data. For now: focus on positioning one screen back and recall on wave crashes."
          : "Here's the plan based on your recent games: focus on positioning one screen back and recall on wave crashes.",
      },
    ]);
    setInput("");
  };

  return (
    <AppShell>
      <div className="rise mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight">AI Coach</h1>
          <p className="text-sm text-muted-foreground">Personal, honest, and always about your games.</p>
        </div>
        {isDemo && <DemoModeBadge />}
      </div>

      <div className="glass rise flex h-[62vh] flex-col rounded-3xl">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "you" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "you"
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.05] text-foreground"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 px-6 pb-3">
          {data.coachSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-xs text-muted-foreground transition-colors hover:bg-white/[0.07] hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Composer */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-white/5 p-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach anything…"
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-40"
            disabled={!input.trim()}
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}