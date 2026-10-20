# Connected-video observer scheduling

Iteration 2 on `perf/optimize-pipjs`, starting at `68c8530`. Reproduce the
counts with `node test/performance.js`; the script is unchanged from phase 1.
These are deterministic VM operation counts, not CPU timings or real-site
browser results. Both measured commands exited 0.

## Before and after

Each row delivers 100 mutation batches over 25 virtual seconds after setup.

| Scenario | 200 ms timers created | Timers fired | DOM queries | Observer callbacks | Observer active |
| --- | --- | --- | --- | --- | --- |
| After leaving PiP | 100 -> 0 | 100 -> 0 | 0 -> 0 | 100 -> 100 | true -> true |
| After Bilibili navigation retaining the video | 100 -> 0 | 100 -> 0 | 0 -> 0 | 100 -> 100 | true -> true |

The other eight scenarios have identical counts to `performance-baseline.md`.
In particular, missing-video discovery still makes 180 queries and creates
60 timers across 10 spaced mutation batches. Normal locked playback remains
at zero callbacks, queries and timers. Automatic PiP entry still performs one
favicon query, and rejection without mediaSession still makes three attempts.

Source size: 16,408 -> 16,479 bytes, an increase of 71 bytes. This slice reduces
runtime work; it does not yet meet the objective of shrinking the userscript.

Before SHA-256:
`73352f4dc6d886e66bff5ebedf1c5a001c33bcb66bd144b26d3d5e9d295f9b14`

After SHA-256:
`7e3c2dcda8fa2d1727de35fc8fdbaf286b2f1ce264a88ad99813d07eae944aaf`

## Change and behavior evidence

`pip.js:180` now creates the debounced rescan separately. The observer callback
at `pip.js:191` checks whether the cached video is connected before scheduling
it. Observation stays active after leave-PiP and retained-video navigation,
so a later video removal still triggers discovery with the existing 200 ms
debounce. The rescan keeps its second connection check: a video reattached
before a queued rescan fires must not reopen manually closed PiP.

Two new regression cases first failed on the original implementation with
`100 !== 0`; the original tests stayed green: `PASS 39 / FAIL 2`. After the
change, those cases verify zero timer creation on both sites, later video
replacement, the 199/200 ms discovery boundary, listener transfer and PiP on
the replacement video. A third case verifies that reconnecting the original
video before the queued callback does not reopen PiP.

Final verification: `node test/run.js` ended `PASS 42 / FAIL 0`.
`node --check pip.js`, syntax checking the changed test, and `git diff --check`
exited 0. LSP reported no errors in either changed JavaScript file. There is
no configured build, linter or formatter. No real-site browser validation was
run in this slice; the PiP request path was not edited.

## Remaining work and commit handoff

Overlapping missing-video discovery remains the next measured candidate.
Focus-event scheduling, navigation debounce delays, PiP retry backoff and
Logger batching are deliberately unchanged. The authorized Brave detection,
Brave/Edge focus/play workaround and unload cleanup areas remain untouched;
their old source guards still pass. No observable behavior change is intended,
so metadata and changelogs are unchanged.

No commit was created by this worker. Suggested subject for the orchestrator:

`perf(observer): cut timers 100->0 in both connected-video cases; bytes 16408->16479`

The preceding measurement commit currently has the subject
`gnhf 1: 完成第一阶段测量，新增 10 个可复现计数场景，确认重复发现与观察器空转两项主要开销，回归保持 PASS 39 / FAIL 0。`
It does not quote a before/after pair or use a Conventional Commit prefix.
The prior report supplies a suitable subject, but the worker must not rewrite
history or create commits. The orchestrator must handle commit-message
requirements before the full stop condition can be claimed.

All validation processes started by this iteration exited. No server,
browser or persistent watcher was started, and `notes.md` was not edited.
