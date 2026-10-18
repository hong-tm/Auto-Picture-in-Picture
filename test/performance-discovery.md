# Overlapping discovery measurement

This slice shares one in-flight video discovery Promise between callers. The
measurement uses `node test/performance.js` with ten mutation batches spaced by
250 virtual milliseconds and no connected video.

| Counter | Before | After | Delta |
| --- | ---: | ---: | ---: |
| YouTube selector queries | 180 | 18 | -162 (-90%) |
| Timers fired | 60 | 15 | -45 (-75%) |
| Retry timers after the observer debounce | 50 | 5 | -45 (-90%) |
| `pip.js` bytes | 16,479 | 16,859 | +380 |

The 15 after timers contain ten 200ms observer debounce timers plus one retry
chain with delays of 200, 400, 600, 800, and 1000ms. The discovery work keeps
the original six selector scans and five retry delays for the whole burst.

Before source SHA-256: `7e3c2dcda8fa2d1727de35fc8fdbaf286b2f1ce264a88ad99813d07eae944aaf`.
After source SHA-256: `d50e66972df005007e21f6309665de6963b036d65c95a49170d29c45de46618c`.
