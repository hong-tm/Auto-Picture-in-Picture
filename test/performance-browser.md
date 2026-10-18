# Browser detector dead code measurement

Measured on `perf/optimize-pipjs`, starting at
`d6ee04e0f9ce1ecf1a4afbd714e24e4feaa38ff8`. This report supersedes the
unverified `/tmp/gnhf-interrupted-performance-browser.md` draft. The implementation
and `test/performance-browser.js` now exist and reproduce its size and count claims.

## Reference evidence

The starting revision contains these unused members:

| Member | References in the starting production source |
| --- | --- |
| `isChrome` getter, line 100 | Declaration only; the separate `#browserInfo.isChrome` field is used by `isChromiumBased` and remains |
| `isFirefox` getter, line 105 | Declaration only; its field at line 70 is read only by this getter |
| `supportsDocumentPiP` getter, line 126 | Declaration only; its field at line 71 is read only by this getter |
| `supportsPictureInPicture` getter, line 115 | Declaration only; actual PiP requests inspect the document/video APIs directly |
| `#getCachedValue`, line 83 | Called only by the unused `supportsPictureInPicture` getter |
| `#cachedResults`, line 58 | Used only by `#getCachedValue` |

Repository JavaScript reference search found no external callers of these
getters. LSP references for `supportsPictureInPicture` also returned only its
declaration. BrowserDetector is local to the userscript IIFE, with no exports
or dynamic property access. The remaining callers use `isBrave`, `isEdge`, and
`isChromiumBased`. The deletion removes 36 lines, without changing those callers.

## Reproduction and results

Run from this worktree:

```sh
node test/performance-browser.js
node test/run.js
node test/performance.js
node --check pip.js
node --check test/performance-browser.js
git diff --check
```

The new probe reads the fixed pre-deletion revision with `git show` and compares
it with the working `pip.js`. It evaluates the existing harness in an isolated
VM, replacing only the userscript evaluator to select the source and count Map
constructions. It instruments `userAgent.includes` through the harness's existing
userAgent option. Neither the harness nor existing tests needed changes.

Before deleting production code, the probe failed with `2 !== 1` at the current
startup Map assertion. After deletion, all probe assertions passed.

| Measurement | Before | After |
| --- | ---: | ---: |
| Source bytes | 16859 | 15953 |
| Userscript Map constructions at startup | 2 | 1 |
| UA includes calls at first detection | 4 | 3 |

Before SHA-256:
`d50e66972df005007e21f6309665de6963b036d65c95a49170d29c45de46618c`

After SHA-256:
`39bc343a3e31174292ea98852037b6d20acfc5915fe8a484efe8234ca9092947`

The 906-byte deletion puts production source 455 bytes below the original
16408-byte baseline. The runtime savings are one startup Map allocation and
one first-detection string check. These are operation counts, not CPU claims.

The probe covers `Chrome/120`, `Chrome/120 Edg/120`, `Chrome/120 Brave`,
`Firefox/120`, and `Safari/17` independently. Each checks automatic PiP entry,
persistence on tab return, and no reopening after manual exit plus a mutation
and redundant focus event. Each makes exactly one PiP request, zero play calls,
zero programmatic exit calls, and reports no errors. Only Edge and Brave UA
cases focus the video, once each. Before/after behavior counts agree. UA checks
change from `Edg/, Brave, Firefox, Chrome` to `Edg/, Brave, Chrome`.

The existing performance probe still reports:

| Scenario | Queries | Timers fired |
| --- | ---: | ---: |
| Locked playback, 100 mutation batches | 0 | 0 |
| 100 redundant focus events | 0 | 1 |
| Cached automatic PiP entry | 1 favicon query | 2 |
| After manual PiP exit, 100 mutation batches | 0 | 0 |
| Bilibili navigation retaining video | 0 | 1 |
| After retained-video navigation, 100 mutation batches | 0 | 0 |
| Bilibili replacement, 100 navigation events | 3 | 1 |
| Missing video, one mutation batch | 18 | 6 |
| Missing video, ten spaced mutation batches | 18 | 15 |
| PiP rejection without mediaSession | 0 | 4 |

Both idle observer cases retain the earlier 100-to-0 timer reduction. Overlapping
discovery retains 180-to-18 queries and 60-to-15 timers. Retry exhaustion still
makes three attempts. All ten rows match the previously recorded runtime counts.

## Verification limits and remaining work

`node test/run.js` passed 43 tests with zero failures. Both performance probes,
both syntax checks, and `git diff --check` exited 0. The new probe has no LSP
error diagnostics; LSP diagnostics for `pip.js` timed out, so no clean LSP claim
is made for that file. There is no configured build, linter, or formatter.

This is VM evidence only. The UA matrix uses the standard mocked PiP API even
for Safari. It does not exercise Safari presentation mode or actual browser
engines. No real YouTube/Bilibili pages or fixture browser lane were visited.
No servers or browsers were started, and all validation processes exited.

There is no intended user-visible behavior change, so paired README changelogs
and metadata remain unchanged. The existing source fences pass unchanged.
Evaluation of the three authorized regions remains for the next iteration:
the uninvoked `navigator.brave?.isBrave` function truthiness, the Brave/Edge
focus/play workaround, and unload cleanup with bfcache restoration accounted
for if pagehide is introduced. This slice does not claim the full stop condition.

No commit was made by this worker. Suggested orchestrator subject:

`perf(browser): remove unused detector members, 16859 to 15953 bytes`
