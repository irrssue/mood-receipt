# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Single-file static web app. No build step, no dependencies, no package manager.

## Dev server

```bash
npx serve -p 3000 .
```

Configured in `.claude/launch.json` — use `preview_start` tool with name `mood-receipt`.

## Architecture

Everything lives in `index.html`: HTML, CSS, and JS in one file.

**Three-screen JS flow** driven by `switchScreen(id)`:
- `#screen-pick` — toggle options (photo / music / mood)
- `#screen-fill` — conditional input sections shown based on `state.selected`
- `#screen-receipt` — receipt rendered from `state` object

**State object** (in-memory, no persistence):
```js
{ selected: Set, photoDataUrl: string|null, ytId: string|null, ytTitle: string|null, ytChannel: string|null }
```

**YouTube** — `parseYtId()` handles both `youtube.com/watch?v=` and `youtu.be/` URLs. Thumbnail via `img.youtube.com/vi/{id}/mqdefault.jpg`. Title/channel via YouTube oEmbed (no API key needed).

**Photo** — FileReader → base64 data URL stored in `state.photoDataUrl`, rendered directly in receipt `<img>`.

**Receipt visuals** — perforated edges use CSS `radial-gradient` on `::before`/`::after` of `.receipt-wrap`. Barcode is pure CSS `repeating-linear-gradient`.

## Conventions

- Keep everything in `index.html`. No JS modules, no separate CSS files.
- Receipt aesthetic: `#f4ede0` paper, `#1a1612` ink, `Space Mono` font, dashed dividers at `1.5px dashed #c8b89a`.
- Mood option is intentionally disabled (coming soon) — `toggleOpt()` no-ops on `data-opt="mood"`.

## Auto-push
After every file edit or write, automatically stage and push changes to `main` branch.
Hook configured in `.claude/settings.local.json` (PostToolUse on Edit|Write).
