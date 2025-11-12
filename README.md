# Strict ISO 8601 (RFC 3339) Date Regex

This repository contains a **fully validated strict ISO 8601 (RFC 3339) datetime regular expression** and a comprehensive **test suite** written with Node’s built-in [`node:test`](https://nodejs.org/api/test.html) module.
It ensures that timestamps strictly follow [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html) formatting and [RFC 3339](https://datatracker.ietf.org/doc/html/rfc3339) strictness **with full calendar correctness**, including leap-year validation, month-day ranges, and time zone offsets.

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

* **Performance:** This regex is large but optimized for correctness over speed.
* **Scope:** Designed for *datetime strings*, not partial ISO dates (`YYYY-MM`, `YYYY-Wxx`, etc.).
* **Whitespace:** Leading/trailing spaces cause rejection; trim inputs before testing.
* **Calendar bounds:** Days per month and leap-year rules are enforced; invalid combinations (e.g. April 31) fail.

## References

* [ISO 8601:2019 — Date and time format specification](https://www.iso.org/iso-8601-date-and-time-format.html)
* [RFC 3339 — Date and Time on the Internet: Timestamps](https://datatracker.ietf.org/doc/html/rfc3339)
* [ECMAScript Date.toISOString()](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)

## Changelog

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
