# 08 — UI Guidelines

BotDiff's design language is calm, premium, and focused on coaching — not on
dumping numbers.

## Principles

- **Apple-quality UI:** polished, intentional, cohesive.
- **Glassmorphism:** layered translucent surfaces with subtle depth.
- **Minimal clutter:** one primary action per page.
- **Progressive disclosure:** show the headline coaching first; reveal detail on
  demand.
- **Blue accent palette:** blue-led with gold highlights for emphasis.
- **Smooth animations:** motion is purposeful and subtle, never decorative noise.
- **Easy-to-understand coaching:** plain language over jargon.

## Core Rules

- Every statistic must explain **why it matters**, not just show a number.
- Prioritize actionable coaching over raw data.
- Use semantic design tokens defined in `src/styles.css` — never hardcode
  colors like `text-white` or `bg-[#...]`.
- Support all four themes (Classic Dark, Challenger Blue, Neon, Frost/Glass)
  through `[data-theme]` tokens; never bypass theming.
- Empty states guide the player to the next action.
- Loading states use skeletons/spinners; error states explain what happened and
  how to fix it — never raw errors.

## Accessibility

- Minimum contrast ratios.
- Keyboard navigation.
- Readable typography and large, clear clickable targets.

## Success

The player should always know where they are, what to do next, and how to
improve.