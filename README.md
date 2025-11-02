# Strict ISO 8601 Date Regex Test Suite

This repository contains a **fully validated ISO 8601 datetime regular expression** and a comprehensive **test suite** written with Node’s built-in [`node:test`](https://nodejs.org/api/test.html) module.
It ensures that timestamps strictly follow ISO 8601 formatting **with full calendar correctness**, including leap-year validation, month-day ranges, and time zone offsets.

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

```js
import { ISO8601Date } from './strict-iso-date-regex.js';

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
node --test strict-iso-date-regex.test.js
```

## Notes & Limitations

* **Performance:** This regex is large but optimized for correctness over speed.
* **Scope:** Designed for *datetime strings*, not partial ISO dates (`YYYY-MM`, `YYYY-Wxx`, etc.).
* **Whitespace:** Leading/trailing spaces cause rejection; trim inputs before testing.
* **Calendar bounds:** Days per month and leap-year rules are enforced; invalid combinations (e.g. April 31) fail.

## References

* [ISO 8601:2019 — Date and time format specification](https://www.iso.org/iso-8601-date-and-time-format.html)
* [ECMAScript Date.toISOString()](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString)

## License

MIT © 2025 — freely usable for validation and educational purposes.
