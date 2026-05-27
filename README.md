# Strict ISO 8601 (RFC 3339) Date Regex

This repository contains a **fully validated strict ISO 8601 (RFC 3339) datetime regular expression** with **top-tier performance**, **dependency-free**, and **Regex-DoS resistant** with low-memory footprint.

It ensures that timestamps strictly follow [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) formatting and [RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339) strictness **with full calendar correctness**, including leap-year validation, month-day ranges, and time zone offsets, validated by a comprehensive **test suite** written with Node’s built-in [`node:test`](https://nodejs.org/api/test.html) module and a **benchmark** [runtime](#performance) against major validators.

## Highlights

- **Strict by construction** — calendar-correct (leap years, 30/31 days, Feb 29) and RFC 3339 timezone range (`−12:00 … +14:00`). What `Date.parse` silently accepts, this rejects.
- **Top-tier performance** — outperforms `zod`, `validator.js`, `ajv`, `Date.parse`, `date-fns`, `luxon`, and `dayjs` on the benchmark inputs shown below ([benchmarks](#performance)). Up to **~100× faster than alternatives on invalid rejection.**
- **Low allocation** — measured at <4 bytes/validation, with minimal observed GC overhead.
- **ReDoS-hardened** — no catastrophic backtracking. Worst observed latency on adversarial input is **~1.5 µs**; fuzzed with 10 000 random strings via `fast-check` — zero crashes, zero hangs.
- **Zero runtime dependencies, zero side effects** — one regex, ESM + CJS + `.d.ts`.
- **Named capture groups** — `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`, `timezone` — parse and validate in one pass, in a way that you can use this to even build your own custom date-time parser if you want to.

## Why

1. After compilation, RegExp are fast and reliable
2. Gregorian DateTime logic does not change — it is essentially static
3. Because `Date` does not validate it semantically (eg. calendar correctness)

```js
new Date('2025-11-31T00:00:00Z')
// 2025-12-01T00:00:00.000Z
```
In this example, passing `November 31st` will convert to `1st of December`, which can lead to VERY nasty bugs and exploits in some contexts (eg. money, enforcing contract dates, etc).

## Usage

### Test for strict RFC 3339 correctness

```js
import { ISO8601Date } from 'iso-8601-regex';

ISO8601Date.test('2025-11-02T00:00:00.000Z'); // true — within boundaries
ISO8601Date.test('2025-11-31T00:00:00.000Z'); // false — only 30 days in November

ISO8601Date.test('2024-02-29T00:00:00.000Z'); // true — 2024 was a leap year
ISO8601Date.test('2025-02-29T00:00:00.000Z'); // false — not a leap year
```

When you get as input any ISO 8601 string, just use this to check its correctness.

```js
if (!ISO8601Date.test(request.startDate)) {
  throw new Error('Invalid ISO 8601 DateString');
}

// safe startDate without temperings
const startDate = new Date(request.startDate);
```

### Using group captured values

This regex provides **named capturing groups** for every major datetime component.
You can use `RegExp.prototype.exec()` (or `.match()` with the `d` flag in future ECMAScript versions) to access them directly.

```js
import { ISO8601Date } from 'iso-8601-regex';

const match = ISO8601Date.exec('2025-11-02T10:20:30.123+09:30');

if (match) {
  const g = match.groups;
  console.log(g);
  /*
  {
    year: '2025',
    month: '11',
    day: '02',
    hour: '10',
    minute: '20',
    second: '30',
    millisecond: '123',
    timezone: '+09:30'
  }
  */
}
```

#### Examples

| Input string                    | Captured values                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `2025-11-02T10:20:30Z`          | `{ year: '2025', month: '11', day: '02', hour: '10', minute: '20', second: '30', millisecond: undefined, timezone: 'Z' }`      |
| `2038-01-19T03:14:07.045+13:59` | `{ year: '2038', month: '01', day: '19', hour: '03', minute: '14', second: '07', millisecond: '045', timezone: '+13:59' }`     |
| `2000-02-29T00:00:00-12:00`     | `{ year: '2000', month: '02', day: '29', hour: '00', minute: '00', second: '00', millisecond: undefined, timezone: '-12:00' }` |
| `2024-06-10T09:08:07.5+14:00`   | `{ year: '2024', month: '06', day: '10', hour: '09', minute: '08', second: '07', millisecond: '5', timezone: '+14:00' }`       |

> **Tip:** The `millisecond` field may be `undefined` if no fractional component is present.
> This is especially useful when normalizing ISO timestamps or building custom date-time parsers.


## Performance

Benchmarks are run with [tinybench](https://github.com/tinylibs/tinybench) on Node.js 22 against the most common datetime-handling libraries in the JS ecosystem. The full script lives in [`benchmark/index.ts`](./benchmark/index.ts) — run it locally with `npm run bench` (takes ~20 s; deps are installed into `benchmark/node_modules`, never into the published package).

> **Hardware:** numbers below were measured on a **MacBook Pro M4 Max**. Absolute ops/s will differ on other machines and Node versions — the **relative ranking** is what matters.

Two kinds of library are compared in the same tables:

| Kind            | Libraries                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| **Validator** (validate only)        | `iso-8601-regex`, [`validator.js`](https://github.com/validatorjs/validator.js), [`zod`](https://github.com/colinhacks/zod) (`z.iso.datetime`), [`ajv`](https://github.com/ajv-validator/ajv) (+ `ajv-formats`, JSON Schema `format: date-time`) |
| **Parser** (parse + validate)        | `Date.parse`, [`luxon`](https://github.com/moment/luxon), [`date-fns`](https://github.com/date-fns/date-fns) (`parseISO`+`isValid`), [`dayjs`](https://github.com/iamkun/dayjs) (strict mode)                                  |

> **Fairness note:** parsers do strictly more work (they build a `DateTime`/timestamp), so they are at a disadvantage on raw throughput. The tables reflect the user-facing API of each library — which is the realistic choice point for application authors.

Three columns matter:

- **Throughput (ops/sec)** — each op = one full dataset pass (1 000 inputs for VALID/INVALID/FUZZY). Higher is better.
- **Heap bytes / validation** — approximate steady-state allocation per input (measured with `--expose-gc`). Lower is better. Anything in the thousands means GC pressure under load.
- **Kind** — validator vs parser.

### Valid ISO 8601 inputs (mixed: UTC, offsets, milliseconds, leap year)

| Library          |   ops/sec ↑ |        bytes/op ↓ | Kind      |
| ---------------- | ----------: | ----------------: | --------- |
| `zod`            |       25633 |             104.3 | validator |
| `iso-8601-regex` |   **25116** |           **3.7** | validator |
| `validator.js`   |       12109 |               3.9 | validator |
| `Date.parse`     |       11545 |              16.3 | parser    |
| `ajv`            |        3842 |             757.1 | validator |
| `date-fns`       |        1297 |            2028.6 | parser    |
| `luxon`          |         778 |            8598.1 | parser    |
| `dayjs`          |          81 |           13127.5 | parser    |

### Invalid inputs (early-rejection path)

| Library          | ops/sec ↑ | bytes/op ↓ | Kind      |
| ---------------- | --------: | ---------: | --------- |
| `iso-8601-regex` | **58219** |    **0.3** | validator |
| `validator.js`   |     38013 |        0.3 | validator |
| `ajv`            |     35927 |      352.4 | validator |
| `Date.parse`     |     31516 |       16.3 | parser    |
| `date-fns`       |      2144 |     1512.1 | parser    |
| `luxon`          |      1133 |     7445.3 | parser    |
| `zod`            |       153 |     5218.7 | validator |
| `dayjs`          |        42 |     8064.8 | parser    |

### Fuzzy / adversarial inputs (random + repeated near-matches)

| Library          | ops/sec ↑ | bytes/op ↓ | Kind      |
| ---------------- | --------: | ---------: | --------- |
| `iso-8601-regex` | **56281** |    **0.5** | validator |
| `Date.parse`     |     26623 |       16.5 | parser    |
| `validator.js`   |     18058 |        0.5 | validator |
| `luxon`          |      5211 |     2706.0 | parser    |
| `ajv`            |       521 |    12685.4 | validator |
| `date-fns`       |       505 |    12799.7 | parser    |
| `zod`            |       301 |     5374.4 | validator |
| `dayjs`          |       144 |    22617.3 | parser    |

### Worst-case latency and fuzz crash safety

| Check                                | Result      |
| ------------------------------------ | ----------: |
| Worst-case latency on fuzzy evil set |  0.0015 ms  |
| `fast-check` property fuzz (10 000 random strings) | ✓ no crashes / hangs |

### What the numbers say

- **Fastest validator across all three datasets** — including against `zod` (close on valid inputs but ~170× slower on invalid).
- **Effectively zero heap allocation** (0.3–3.7 bytes/validation across all datasets). The closest competitor on allocation, `validator.js`, is also allocation-free but ~2× slower throughput.
- **No ReDoS pathology**: worst observed latency on adversarial input is ~1.5 µs.

> Absolute ops/s shifts between machines, Node versions, and V8 JIT specialization. The **relative ranking** is what matters — datasets are shuffled and re-evaluated on every run to limit IC specialization.

## Comparison

| Feature                                     | `iso-8601-regex` | `validator.js` | `zod` | `ajv` | `date-fns` | `dayjs` | `luxon` | `Date.parse` |
| ------------------------------------------- | :--------------: | :------------: | :---: | :---: | :--------: | :-----: | :-----: | :----------: |
| Strict RFC 3339 validation                  |        ✅        |     partial    |  ✅  |  ✅   |  partial   | partial | partial |      ❌      |
| Calendar correctness (leap year, month/day) |        ✅        |       ❌       |  ❌  |  ❌   |    ✅      |   ✅    |   ✅    |      ❌      |
| Strict timezone range `−12:00 … +14:00`     |        ✅        |       ❌       |  ❌  |  ❌   |    ❌      |   ❌    |   ❌    |      ❌      |
| Named capture groups                        |        ✅        |       ❌       |  —   |  —   |     —      |    —    |    —    |      —      |
| Zero runtime dependencies                   |        ✅        |       ❌       |  ❌  |  ❌   |    ❌      |   ❌    |   ❌    |      —      |
| Zero heap allocation per call               |        ✅        |       ✅       |  ❌  |  ❌   |    ❌      |   ❌    |   ❌    |      ❌      |
| ReDoS-tested (fuzz + adversarial)           |        ✅        |       ❌       |  ❌  |  ❌   |    ❌      |   ❌    |   ❌    |      —      |
| Fast invalid rejection                      |        ✅        |       ✅       |  ❌  |  ✅   |    ⚠️      |   ❌    |   ⚠️    |      ✅      |

## Mechanics

The regex matches only **valid and complete** ISO 8601 datetime strings of the form:

```
YYYY-MM-DDTHH:mm:ss(.SSS)?(Z|±HH:MM)
```

### Examples that match

| Example                         | Description           |
| ------------------------------- | --------------------- |
| `2025-11-02T10:20:30Z`          | Basic UTC timestamp   |
| `2025-11-02T10:20:30.123Z`      | With milliseconds     |
| `2025-11-02T10:20:30+09:30`     | With positive offset  |
| `2024-02-29T12:00:00Z`          | Leap year February 29 |
| `2025-04-30T23:59:59.999+00:00` | Month with 30 days    |

### Examples that do *not* match

| Example                 | Reason                          |
| ----------------------- | ------------------------------- |
| `2025-11-02T10:20:30`   | Missing `Z` or offset           |
| `2025-11-02 10:20:30Z`  | Space instead of `T`            |
| `2025-04-31T12:00:00Z`  | April has only 30 days          |
| `2025-11-02T24:00:00Z`  | Hour overflow                   |
| `1900-02-29T00:00:00Z`  | 1900 not a leap year            |
| ` 2025-11-02T10:20:30Z` | Leading space (anchored at `^`) |


## Regex Features

### Enforces

* Year: `0000–9999`
* Month: `01–12`
* Day: `01–31` (valid per month, leap-year aware)
* Hours: `00–23`
* Minutes: `00–59`
* Seconds: `00–59`
* Milliseconds: optional `1–3` digits
* Time zone: `Z` or `±HH:MM` (00–23h / 00–59m)
* Anchored at both ends (`^…$`) — **no leading/trailing characters allowed**

### Leap Year Logic

Leap years match the Gregorian rule:

* Divisible by 4 → leap year
* Except years divisible by 100 → *not* leap year
* Except years divisible by 400 → leap year again

- `2000`, `2016`, `2024` are leap years
- `1900`, `2100` are not

## Test Coverage

The test suite verifies:

| Category             | Examples tested                                          |
| -------------------- | -------------------------------------------------------- |
| **Basic formats**    | UTC (`Z`), fractional seconds, positive/negative offsets |
| **Time boundaries**  | `00:00:00`–`23:59:59`, offsets `±00:00`–`±23:59`         |
| **Month/day bounds** | Correct 30- vs 31-day months                             |
| **Invalid overflow** | Hours ≥24, minutes/seconds ≥60, too many ms digits       |
| **Non-ISO shapes**   | Wrong separators, missing parts, trailing junk           |
| **Leap years**       | Accepts Feb 29 only in leap years                        |
| **Common years**     | Rejects Feb 29 on non-leap years                         |
| **Anchors**          | Rejects leading/trailing spaces and extra characters     |
| **Regression cases** | Valid timestamps across centuries and time zones         |

## Running the Tests

Make sure you’re using **Node.js v20+**, then run:

```bash
npm test
```

## Notes & Limitations

* **Performance:** Large but ReDoS-resistant and consistently faster than `validator.js`, `luxon`, and `Date.parse` for validation — see [Performance](#performance).
* **Scope:** Designed for *datetime strings*, not partial ISO dates (`YYYY-MM`, `YYYY-Wxx`, etc.).
* **Whitespace:** Leading/trailing spaces cause rejection; trim inputs before testing.
* **Calendar bounds:** Days per month and leap-year rules are enforced; invalid combinations (e.g. April 31) fail.

## References

* [ISO 8601:2019 — Date and time format specification](https://www.iso.org/iso-8601-date-and-time-format.html)
* [RFC 3339 — Date and Time on the Internet: Timestamps](https://datatracker.ietf.org/doc/html/rfc3339)
* [ECMAScript Date.toISOString()](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)

## Changelog

### v0.2.5 — 2026-05-27

* Added comprehensive performance + memory benchmarks against `validator.js`, `zod`, `ajv`, `date-fns`, `dayjs`, `luxon`, and `Date.parse` ([`benchmark/`](./benchmark/)).
* New **Performance** and **Comparison** sections in README with ops/sec and heap-bytes-per-validation numbers.
* Benchmark suite isolated under `benchmark/` with its own `package.json`; **root package is now zero-dependency** (`luxon` and `validator` moved out of runtime deps — they were only used by the benchmark).
* Added GitHub Actions workflow to run benchmarks on PRs and comment results.

### v0.2.4 — 2025-11-12

* Security enhancement, added provenance files

### v0.2.3 — 2025-11-12

* Added CommonJS export
* Improved test suite with performance tests
* Moved to a proper repository

### v0.2.2 — 2025-11-04

* Update import example in README.md

### v0.2.1 — 2025-11-04

* Changing README.md title
* Update homepage URL in `package.json`

### v0.2.0 — 2025-11-03

**Breaking**

* Validate strict timezone range `−12:00…+14:00`

**Added**

* Named capturing groups: `year`, `month`, `day`, `hour`, `minute`, `second`, `millisecond`, and `timezone`.
* New section in README: **“Using group captured values”**, with examples and table of captured outputs.
* Extended test suite for group extraction (`node:test`).

**Improved**

* Simplified month capture pattern (`0[1-9]|1[0-2]`) for readability and correctness.
* Refined timezone range enforcement: now validates strictly within **−12:00 … +14:00**, rejecting `−12:01…−12:59` and `+14:01…+14:59`.
* Unified spelling to **`millisecond`** across code and documentation.

### v0.1.1 — 2025-11-02

**Added**

* Strict ISO 8601 regex with full Gregorian calendar correctness (month/day validation and leap-year logic).
* Test suite using Node’s native `node:test` and `assert/strict` modules.
* Validation of fractional seconds, offsets, and anchors.

**Improved**

* Leap-year computation: accepts `2000`, `2400`, rejects `1900`, `2100`.
* Tests covering non-ISO shapes and extended formats.

### v0.1.0 — 2025-11-02

**Initial release:** foundational strict ISO 8601 validation for UTC.

## License

MIT License

Copyright 2025 lightningspirit@gmail.com

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
