# PROJECT KNOWLEDGE BASE

**Generated:** 2026-11-01 (for v1.5.3)
**Version:** 1.5.3
**Branch:** `main`

## OVERVIEW

Tampermonkey userscript (single file `pip.js`, v1.5.3) that auto-enters Picture-in-Picture when the tab (or window) is switched away during video playback. Targets YouTube + Bilibili only, Chrome/Edge/Brave (Safari fallback path). Distributed via GreasyFork (script id 516762).

## STRUCTURE

```
./
├── pip.js         # entire userscript (614 lines, all logic)
├── test/          # zero-dependency node:vm harness (test/harness.js) + regression suite; entry `node test/run.js` (68 assertions)
│                  #   also: performance.js / performance-browser.js (standalone perf scripts) + performance-*.md notes
├── README.md      # English doc; changelog v1.4 → v1.5.3; Chrome flags documented as optional native paths
├── README_zh.md   # Chinese doc
└── AGENTS.md      # this file: project knowledge base + agent workflow
```

No build, no bundler, no package.json, no CI. Edits go straight to `pip.js`. `test/` is pure Node, zero dependencies.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add a site | `VideoController.VIDEO_SELECTORS` (~L116) | hostname → CSS selector list, first match wins |
| Change trigger behavior | `#applyActiveState` (~L455, registered ~L522) | core: active = `!document.hidden && #isWindowFocused` (`#computeActive` ~L452); inactive + playing → PiP, active again → exit. `visibilitychange` + `window` `blur`/`focus` (`#onWindowBlur`/`#onWindowFocus` ~L474) |
| PiP request + fallbacks | `VideoController.requestPictureInPicture` (~L324) | mediaSession setup, Brave/Edge focus+play workaround, 3× retry backoff |
| Native vs script PiP exit | `#onEnterPiP`/`#onLeavePiP` (~L437/~L443) + request source tracking | v1.5.3: browser-owned PiP (Media Session action) closes natively; script-triggered PiP still exits on return |
| Video discovery | `getVideoElement` (~L252) | retry ≤5, cached in `#lastVideoElement` until disconnected; `#shorts()` (~L267) picks the active Shorts player |
| SPA navigation | `#addEventListeners` (~L511) | YouTube: `yt-navigate-finish` (~L531); Bilibili: `#installBilibiliNavigationWatch` (~L214) wraps `history.pushState`/`replaceState` + `popstate` → `#scheduleBiliRescan` (~L237, 300 ms debounce) |
| PiP enter/leave state | `#syncPipListeners` (~L185) | keeps `enterpictureinpicture`/`leavepictureinpicture` listeners on the current video; events fire on the video element, not `document` |
| Observer lifecycle | `#setVideoObserverActive` (~L170) | disconnects the MutationObserver once a video is locked; reconnects on SPA nav, failed lookup, or leave-PiP |
| Page cleanup | `pagehide` listener (~L608) | bfcache-aware (v1.5.0); replaced the deprecated `unload` |
| Browser quirks | `BrowserDetector` (~L57) | UA sniff, cached; Brave detect via `navigator.brave` |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| Logger | class | ~L22 | batched debug log; dormant unless `DEBUG=true` (L20) |
| BrowserDetector | class | ~L57 | Edge/Brave/Chrome/Firefox flags + PiP support checks |
| VideoController | class | ~L96 | all runtime logic; singleton instance at ~L597 |
| `VideoController.#isTabActive` / `#isWindowFocused` | private fields | ~L97/~L98 | combined active state, updated only through `#applyActiveState` |
| `VideoController.#setVideoObserverActive` | private method | ~L170 | idempotent connect/disconnect of the MutationObserver |
| `VideoController.#syncPipListeners` | private method | ~L185 | detach PiP listeners from stale video, attach to the current one |
| `VideoController.#installBilibiliNavigationWatch` | private method | ~L214 | wraps `history.pushState`/`replaceState`, adds `popstate`; runs once (`#biliNavWrapped`) |
| `VideoController.#rescanAfterNavigation` | private method | ~L241 | re-finds the video after Bilibili SPA nav, re-enters PiP if inactive + playing |
| `VideoController.#shorts` | private method | ~L267 | true on YouTube Shorts pages |
| `VideoController.#computeActive` | private method | ~L452 | `!document.hidden && #isWindowFocused` |
| `VideoController.#applyActiveState` | private handler | ~L455 | single trigger entry point for tab + window state changes |
| `VideoController.#onEnterPiP` / `#onLeavePiP` | private handlers | ~L437/~L443 | request-source tracking; leave reactivates the observer |

## CONVENTIONS

- IIFE + `"use strict"`; classes with `#private` fields; tab indentation.
- Feature-detect everything (`"x" in navigator`), swallow errors with `catch {}` + log.
- Diagnostics gated by top constant `DEBUG` (false in release).
- Userscript header metadata (`@match`, `@version`, GreasyFork URLs) must be bumped on release.
- Any `pip.js` change must keep `node test/run.js` green (68 assertions); add a regression test per bugfix.

## ANTI-PATTERNS (THIS PROJECT)

- Do not add build tooling or split the file; GreasyFork consumes `pip.js` directly.
- Do not break the Tampermonkey header block (first ~15 lines).

## NOTES

- Chrome flags (`#media-session-enter-picture-in-picture`, `#browser-initiated-automatic-picture-in-picture`) are documented in README as **optional** native paths, not required setup: with flags at Default the script keeps its own fallback. README tells users to test native behavior with the script disabled first.
- Still fenced (known, deliberately not fixed): the `navigator.brave?.isBrave` truthy check (~L65, a resolved Promise is always truthy) and the Brave/Edge `video.focus()` + `video.play()` branch (~L348). The deprecated `unload` cleanup listener was replaced by bfcache-aware `pagehide` handling in v1.5.0. Other future features (generic site detection, hotkeys, GM menu, Document PiP) stay out of scope.
- Release history: v1.4 (2025-06) → v1.4.1 bugfix chain + Issue #4 window-focus work (v1.5.0) → v1.5.1/v1.5.2/v1.5.3 all landed on `main` via squash-merged PRs #5–#8 (2026-10/11).

---

# Agent workflow (four beats)

Work in four beats: **isolate → build → prove → ship**. Make the change on its own branch,
build the smallest correct change, prove it with the checks below, then ship it as a PR.
Only the parts specific to this repo are covered here.

Checks for this repo:

```bash
node test/run.js    # 68 assertions, zero dependencies; runs from the repo root
```

Hard invariants:

- It is a single userscript (`pip.js`): no build step, no bundler, no dependencies. Keep it one file.
- Real-site PiP behaviour cannot be proven by fixtures alone. Verification means driving a real page
  in headless Chromium (`--no-sandbox --autoplay-policy=no-user-gesture-required`), injecting the
  userscript before `document.documentElement` exists, faking page visibility, and asserting
  `document.pictureInPictureElement === video`. Candidate video URLs get tried one by one: consent,
  login walls, rate limiting and lazy loading all make single-URL runs unreliable.
- Release flow: verify locally in Tampermonkey first, only then open the PR.
