# Operation-count baseline

Phase 1, measured before changing `pip.js`. Reproduce with
`node test/performance.js`. The script uses the existing zero-dependency VM
harness and prints JSON. It does not rewrite the userscript or the harness.

Revision: `9006a6f3c3fa33c5d14e441a417c58bac3c4bb3b` on `perf/optimize-pipjs`.
Source size: 16,408 bytes.
Source SHA-256: `73352f4dc6d886e66bff5ebedf1c5a001c33bcb66bd144b26d3d5e9d295f9b14`.

These are deterministic operation counts, not CPU time or browser benchmarks.
Mutation batches are explicitly delivered by the harness. The clock advances
virtually, without real sleeps. Each scenario excludes its setup. Synchronous
startup and the initial 500 ms timer are not instrumented. Query counts include
all selectors; the automatic entry row queries only the favicon.

## Raw counts

Timer histograms use `delay in ms: number scheduled`. Fired counts include only
instrumented timers. Observer active is the final state.

| Scenario | Queries | Timer histogram | Fired | Cancelled | Observer callbacks | Observer active |
| --- | ---: | --- | ---: | ---: | ---: | --- |
| Locked playback, 100 mutation batches over 25 virtual seconds | 0 | none | 0 | 0 | 0 | false |
| 100 redundant focus events in one burst | 0 | 100:100 | 1 | 99 | 0 | false |
| Cached video, one automatic PiP entry | 1 | 100:1, 200:1 | 2 | 0 | 0 | false |
| After leaving PiP, 100 mutation batches over 25 virtual seconds | 0 | 200:100 | 100 | 0 | 100 | true |
| Bilibili navigation retaining the connected video | 0 | 300:1 | 1 | 0 | 0 | true |
| After retained-video navigation, 100 mutation batches over 25 virtual seconds | 0 | 200:100 | 100 | 0 | 100 | true |
| Bilibili replacement, 100 navigation events in one burst | 3 | 300:100 | 1 | 99 | 0 | false |
| Missing video, one mutation batch, retries exhausted | 18 | 200:2, 400:1, 600:1, 800:1, 1000:1 | 6 | 0 | 1 | true |
| Missing video, 10 mutation batches 250 virtual ms apart | 180 | 200:20, 400:10, 600:10, 800:10, 1000:10 | 60 | 0 | 10 | true |
| PiP rejection without mediaSession, retries exhausted | 0 | 100:1, 200:1, 750:1, 1125:1 | 4 | 0 | 0 | false |

The Bilibili replacement row queries each of its three selectors once. The
missing-video rows query each of the three YouTube selectors 6 and 60 times,
respectively. The rejection row attempts PiP exactly 3 times and emits 4 errors
to console and 4 corresponding GM_log messages. All other rows emit no logs or
errors. The JSON field `debugMessages` counts all harness log entries, including
those GM_log error messages; it is not a count of Logger.log calls.

## Findings and next slices

- `pip.js:283` caches a connected video. Repeated calls during automatic entry
  do not repeat video DOM queries. Normal locked playback produces no observer
  callbacks or timers under the measured workload.
- `pip.js:181` debounces mutation delivery for 200 ms, but each callback can
  start another asynchronous discovery chain. Ten batches spaced 250 ms apart
  produce 10 overlapping chains, 180 queries and 60 timers. This is the largest
  measured query cost. A later slice should examine sharing in-flight discovery
  while preserving late-video discovery and retries.
- `pip.js:272` enables observation before checking whether the cached video is
  still connected. After a retained-video Bilibili navigation, 100 mutation
  batches produce 100 timers and callbacks that perform no queries. The same
  cost appears after `#onLeavePiP` at `pip.js:464` reactivates observation.
  A small first optimization is to avoid scheduling the observer debounce for
  a connected cached video, while keeping observation available to detect its
  later removal. Existing tests explicitly require reconnection on leave-PiP.
- `pip.js:167` computes `fn.toString()` on every debounce call. The 100 ms state
  debounce at `pip.js:476` and 300 ms navigation debounce at `pip.js:269` each
  schedule 100 timers and cancel 99 for a burst of 100 inputs. Timing is part of
  the behavior contract; changing delay values is not justified by these counts.
- `pip.js:414` schedules 750 ms and 1125 ms retry backoffs after rejection when
  mediaSession is absent. The measured three-attempt bound works. Leave it alone
  unless a later measurement establishes unnecessary retries.
- `pip.js:38` returns immediately when DEBUG is false. Successful scenarios
  produce no Logger batching timers. Removing batching is not a measured runtime
  win in the release configuration.

The Brave/Edge focus/play workaround at `pip.js:371` and the unload listener at
`pip.js:634` are unchanged and not browser-validated in this slice. Brave
detection currently reads the `isBrave` function itself, without invoking it;
its truthiness is already enough to select the workaround, before any Promise
could be returned. Cleanup and browser-detection changes need separate evidence.
`test/fenced-guards.test.js` still asserts exact source text for all three
previously fenced regions. Those guards reflect the older scope and conflict
with editing the now-authorized regions; a future slice must address that
contract explicitly with behavior coverage, not silently bypass the tests.

## Verification and commit handoff

Before instrumentation: `node test/run.js` ended `PASS 39 / FAIL 0`, and
`node --check pip.js` exited 0. After adding the measurement script, its run and
the same 39 tests passed; syntax checks of both JavaScript files exited 0, and
the new script had no LSP error diagnostics. There is no build or formatter
configuration in this worktree.

No runtime optimization has been made yet. The production source remains
16,408 -> 16,408 bytes; its measured costs are the before values for later
slices. This iteration adds measurement coverage for 10 scenarios, from 0 to
10. No commits were made by the worker. Suggested subject for the orchestrator:

`test(perf): add 0->10 count scenarios; baseline 180 queries/60 timers, 16408->16408 bytes`

The loop must continue: subsequent optimization commits need their own measured
before/after deltas, final regression checks, and an overall optimization summary.
