# PROJECT KNOWLEDGE BASE

**Generated:** 2026-11-06 (for v1.6.0)
**Version:** 1.6.0
**Branch:** `main`

## OVERVIEW

Tampermonkey userscript (single file `pip.js`, v1.6.0) that auto-enters Picture-in-Picture when the tab becomes hidden (`document.hidden`, e.g. switching tabs or minimizing the window) during video playback. `document.hidden` is the only trigger: window `blur`/`focus` are not listened to, so a visible window that loses focus neither enters nor closes PiP. Targets YouTube, YouTube Music, Bilibili and Bilibili Live; README documents Chrome/Edge/Brave as primary plus Firefox 130+ (experimental, with its own setup section) and a Safari fallback path (`webkitSetPresentationMode`). Ships a userscript menu (Settings + Menu classes): master switch and "Close PiP on return" switch, persisted via `GM_setValue` with `localStorage` fallback. Distributed via GreasyFork (script id 516762).

Chrome's native Auto PiP (Chrome 134+, gradual rollout, flag `#auto-picture-in-picture-for-video-playback`) fires the `enterpictureinpicture` Media Session action the script registers and allows a gestureless `requestPictureInPicture` inside it; the browser closes that window when the page returns. The script cooperates instead of competing (see WHERE TO LOOK "Native vs script PiP exit"). `HTMLVideoElement.autoPictureInPicture` was removed from Chromium in 2022 — do not use it.

## STRUCTURE

```
./
├── pip.js         # entire userscript (659 lines, all logic)
├── test/          # zero-dependency node:vm harness (test/harness.js) + regression suite; entry `node test/run.js` (108 test cases)
│                  #   also: performance.js / performance-browser.js (standalone perf scripts) + performance-*.md notes
│                  #   live-check.js: optional real-browser check (fixtures + live sites) in a CDP isolated world; needs global Playwright
├── README.md      # English doc; changelog v1.4 → v1.6.0; Chrome flags documented as optional native paths + minimize guidance
├── README_zh.md   # Chinese doc
└── AGENTS.md      # this file: project knowledge base + agent workflow
```

No build, no bundler, no package.json, no CI. Edits go straight to `pip.js`. `test/` is pure Node, zero dependencies.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add a site | `VideoController.VIDEO_SELECTORS` (~L194) | hostname `includes()` over keys **in insertion order** — a more specific host key (e.g. `"live.bilibili.com"`) must come before the broader one (`"bilibili.com"`), or the broad key matches first. `music.youtube.com` needs no own key: the `youtube.com` selectors match its `#movie_player video`. |
| Change trigger behavior | `#onVisibilityChange` (~L519) | single trigger entry: hidden + playing → PiP (sync when `userActivation.isActive`, else a 300/100 ms timer), visible → exit. `enablePiP` (~L455) rejects script requests on a visible tab, honors `Settings.enabled` (with the master switch off, `setupMediaSession` registers a null `enterpictureinpicture` handler, re-run from the Menu toggle, because native Auto PiP fires that action too) and `#userDismissed`. `#onVideoPlaying` (~L515) retries when a video starts or resumes while hidden |
| PiP request + fallbacks | `VideoController.requestPictureInPicture` (~L416) | returns false silently without a PiP API; Brave/Edge focus+play workaround; a rejected request logs quietly and returns false — no retry loop (removed in v1.6.0; every current browser ships `mediaSession`). NotAllowedError without a fresh user gesture is expected on stock Chrome, especially for minimize |
| Native vs script PiP exit | `#onEnterPiP`/`#onLeavePiP` (~L496/~L504) + request source tracking | a spontaneous `enterpictureinpicture` while hidden with no script request in flight (`!#entryPending && document.hidden`) is browser-owned (native Auto PiP, media controls, site's own player) → `#browserPiP = true`, and `disablePiP` gives the browser a 1 s head start (a competing exit can hang the native close), then exits itself if the page is still visible and PiP still open — the browser does not always close it. A user PiP opened on a *visible* page stays script-closed on return (default; `Settings.closeOnReturn` turns that off) |
| Menu + settings | `Settings` (~L63), `Menu` (~L104) | `Settings.enabled` / `Settings.closeOnReturn`, defaults true/true, persist as JSON via `GM_getValue/GM_setValue` (key `settings`) with `localStorage` fallback (key `auto-pip-settings`); cached after first read. `Menu.setup()` registers/re-registers the two commands when `GM_registerMenuCommand` exists (labels refresh only when `GM_unregisterMenuCommand` also exists) |
| Video discovery | `getVideoElement` (~L342) | retry ≤5, cached in `#lastVideoElement` until disconnected or `yt-navigate-finish`; `#shorts()` (~L357) only checks the URL (YouTube `/shorts/` path); `#findVideoElement` (~L361) uses `["#shorts-player video"]` on Shorts (the `ytd-reel-video-renderer[is-active]` selector no longer matches the live site and was removed) |
| SPA navigation | `#addEventListeners` (~L554) | YouTube: `yt-navigate-finish` drops the cached video; Bilibili (incl. live): `#installBilibiliNavigationWatch` (~L318) listens to Navigation API `currententrychange` + `popstate` → `#scheduleBiliRescan` (~L322, 300 ms debounce). Never patch page `history`: on Firefox the page cannot call sandbox functions (Xray), which would break the site's router |
| PiP enter/leave state | `#syncPipListeners` (~L287) | keeps `enterpictureinpicture`/`leavepictureinpicture`/`playing` listeners on the current video (re-synced on leave-PiP); events fire on the video element, not `document`. Chromium keeps a removed video as `pictureInPictureElement` with no leave event, so PiP counts as open only when that element `isConnected` |
| Observer lifecycle | `#setVideoObserverActive` (~L272) + the observer callback in `#setupVideoObserver` | disconnects the MutationObserver once a video is locked; reconnects on SPA nav, failed lookup, or leave-PiP. The callback filters mutations: with no video locked yet, only batches that added a `<video>` (directly or inside an added element) trigger a rescan — chat iframes and busy pages stay idle. Once a locked video was lost (`#lastVideoElement` set but disconnected), any mutation rescans. `test/harness.js` `flushMutations()` defaults to a video-added record to model that |
| Page cleanup | `pagehide` listener (~L652) | bfcache-aware (v1.5.0); replaced the deprecated `unload` |
| Browser quirks | `BrowserDetector` (~L141) | UA sniff, cached; Brave detect via `navigator.brave` |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| Logger | class | ~L28 | batched debug log; dormant unless `DEBUG=true` (L26) |
| Settings | class | ~L63 | persisted toggles `enabled` / `closeOnReturn`; GM storage with localStorage fallback |
| Menu | class | ~L104 | registers the two Tampermonkey menu commands, refreshes labels on toggle |
| BrowserDetector | class | ~L141 | cached UA sniff; exposes only `isEdge`/`isBrave`/`isChromiumBased` getters (no Firefox flag, no PiP-support check) |
| VideoController | class | ~L180 | all runtime logic; singleton instance at ~L641 |
| `VideoController.#setVideoObserverActive` | private method | ~L272 | idempotent connect/disconnect of the MutationObserver |
| `VideoController.#syncPipListeners` | private method | ~L287 | detach PiP listeners from stale video, attach to the current one |
| `VideoController.#installBilibiliNavigationWatch` | private method | ~L318 | listens to `navigation` `currententrychange` and `popstate` |
| `VideoController.#rescanAfterNavigation` | private method | ~L331 | re-finds the video after Bilibili SPA nav, re-enters PiP if inactive + playing |
| `VideoController.#shorts` | private method | ~L357 | true on YouTube Shorts pages |
| `VideoController.#onVisibilityChange` | private handler | ~L519 | single trigger entry point |
| `VideoController.#onVideoPlaying` | private handler | ~L515 | enters PiP when the locked video starts or resumes on a hidden page |
| `VideoController.#onEnterPiP` / `#onLeavePiP` | private handlers | ~L496/~L504 | enter classifies spontaneous hidden entries as browser-owned; leave records a user dismissal, re-syncs listeners and reactivates the observer |

## CONVENTIONS

- IIFE + `"use strict"`; classes with `#private` fields; tab indentation.
- Feature-detect everything (`"x" in navigator`, `typeof GM_getValue === "function"`), swallow errors with `catch {}` + log.
- Diagnostics gated by top constant `DEBUG` (false in release).
- Bump `@version` on release; preserve the other userscript header metadata unless the release specifically requires changing it — the fenced-guards header fixture pins every header line (v1.6.0 added `@match music/live.bilibili.com` and four `@grant` lines; the fixture was updated with it).
- Any `pip.js` change must keep `node test/run.js` green (108 test cases); add a regression test per bugfix.

## ANTI-PATTERNS (THIS PROJECT)

- Do not add build tooling or split the file; GreasyFork consumes `pip.js` directly.
- Do not break the Tampermonkey header block (first 21 lines through `==/UserScript==`).
- Do not gate the script's own fallback on native Auto PiP capability detection: a previous attempt prioritized the native path and disabled the fallback, and users without the flags lost all auto PiP. Native cooperation must be additive.
- Do not add `@noframes`: embedded players keep working through the frame matches; the observer's video-added filter already keeps video-less frames (live chat) idle.

## NOTES

- Chrome flags (`#auto-picture-in-picture-for-video-playback`, `#browser-initiated-automatic-picture-in-picture`) are documented in README as **optional** native paths, not required setup: with flags at Default the script keeps its own fallback. README tells users to test native behavior with the script disabled first, and has a dedicated "Minimize does not trigger?" note (minimize needs the native path; the script's own request only works ~5 s after a click because a userscript cannot create a user gesture).
- Native Auto PiP eligibility (Chrome 134+): media audible within the last 2 s, playing, audio focus, top frame, the script's `enterpictureinpicture` handler registered, site permission / MEI threshold. Muted videos and iframe players therefore rely on the script's gesture path.
- Headless limits (verified): `userActivation` is always true in headless Chromium and `bringToFront` does not produce a real hidden state, so the gestureless-minimize failure and physical minimize cannot be reproduced in `test/live-check.js`; physical minimize is a manual check on the user's machine.
- Live verification 2026-11-06 (live-check, real Chromium): YouTube watch + Shorts, Bilibili video, YouTube Music (`music.youtube.com/watch?v=dQw4w9WgXcQ`) and Bilibili live room `live.bilibili.com/1` all entered and exited PiP on real pages; selectors `#live-player video` / `.live-player-ctnr video` confirmed on a real room (some rooms captcha/login-gate headless runs — try candidates one by one).
- Still fenced (known, deliberately not fixed): the `navigator.brave?.isBrave` truthy check (~L149 — it tests the uncalled function reference; `navigator.brave.isBrave` is a function returning a Promise, and the test harness stubs it as `() => Promise.resolve(true)`, so the reference is always truthy) and the Brave/Edge `video.focus()` + `video.play()` branch (~L424). Future features that stay out of scope: generic site detection, hotkeys, Document PiP.
- Release history: v1.4 (2025-06) → v1.4.1 bugfix chain + Issue #4 window-focus work (v1.5.0) → v1.5.1/v1.5.2/v1.5.3 landed on `main` via squash-merged PRs #5–#8 (2026-10/11) → v1.5.4 + 7-bugfix chain (uncommitted working tree, user-verified) → v1.6.0 (user-verified in Tampermonkey: occlusion and tab switch OK, minimize needs a recent click as documented; includes the browser-owned PiP return-close fallback).

---

# Agent workflow (four beats)

Work in four beats: **isolate → build → prove → ship**. Make the change on its own branch,
build the smallest correct change, prove it with the checks below, then ship it as a PR.
Only the parts specific to this repo are covered here.

Checks for this repo:

```bash
node test/run.js    # 108 test cases, zero dependencies; runs from the repo root
NODE_PATH=<global node_modules> node test/live-check.js    # real Chromium: fixtures + live YouTube/Shorts/Bilibili video/Bilibili live/YouTube Music; add --fixture-only offline
```

Hard invariants:

- It is a single userscript (`pip.js`): no build step, no bundler, no dependencies. Keep it one file.
- Real-site PiP behaviour cannot be proven by fixtures alone. Verification means driving a real page
  in headless Chromium (`--no-sandbox --autoplay-policy=no-user-gesture-required`), injecting the
  userscript in an isolated world (`test/live-check.js` does this over CDP), faking page visibility, and
  asserting `document.pictureInPictureElement === video`. Candidate video URLs get tried one by one: consent,
  login walls, rate limiting and lazy loading all make single-URL runs unreliable.
- Release flow: verify locally in Tampermonkey first, only then open the PR.
