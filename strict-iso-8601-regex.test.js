import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { ISO8601Regex } from './strict-iso-8601-regex.js';

describe('ISO8601Regex — strict ISO 8601 with calendar correctness', () => {
  test('accepts basic valid forms (UTC, fractional, offsets)', async (t) => {
    const cases = [
      ['basic UTC', '2025-11-02T10:20:30Z'],
      ['ms .1', '2025-11-02T10:20:30.1Z'],
      ['ms .12', '2025-11-02T10:20:30.12Z'],
      ['ms .123', '2025-11-02T10:20:30.123Z'],
      ['offset +00:00', '2025-11-02T10:20:30+00:00'],
      ['offset -05:00', '2025-11-02T10:20:30-05:00'],
      ['offset +09:30 with fraction', '2025-11-02T10:20:30.5+09:30'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input), `Expected match: ${input}`));
    }
  });

  test('accepts strict time boundaries and offset boundaries', async (t) => {
    const cases = [
      ['lower bound time', '2025-11-02T00:00:00Z'],
      ['upper bound time', '2025-11-02T23:59:59Z'],
      ['offset +23:59', '2025-11-02T10:20:30+23:59'],
      ['offset -23:59', '2025-11-02T10:20:30-23:59'],
      ['offset -00:00', '2025-11-02T10:20:30-00:00'],
      ['offset +00:00 with ms', '2025-11-02T23:59:59.999+00:00'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input), `Expected match: ${input}`));
    }
  });

  test('accepts day ranges per month (shape-valid 31 and 30 day months)', async (t) => {
    const cases = [
      ['Jan 31st', '2025-01-31T12:00:00Z'],
      ['Mar 31st', '2025-03-31T12:00:00+01:00'],
      ['Apr 30th', '2025-04-30T12:00:00Z'],
      ['Nov 30th', '2025-11-30T12:00:00Z'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input)));
    }
  });

  test('rejects overflow in time components (hour/minute/second/ms)', async (t) => {
    const cases = [
      ['hour 24', '2025-11-02T24:00:00Z'],
      ['hour 99', '2025-11-02T99:00:00Z'],
      ['minute 60', '2025-11-02T23:60:00Z'],
      ['second 60', '2025-11-02T23:59:60Z'],
      ['ms 4 digits', '2025-11-02T10:20:30.1234Z'],
      ['offset hour 24', '2025-11-02T10:20:30+24:00'],
      ['offset minute 60', '2025-11-02T10:20:30+23:60'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input), `Expected no match: ${input}`));
    }
  });

  test('rejects non-ISO shapes / separators / missing parts', async (t) => {
    const cases = [
      ['slashes', '2025/11/02 10:20:30Z'],
      ['space instead of T', '2025-11-02 10:20:30Z'],
      ['date only', '2025-11-02'],
      ['time only', '10:20:30Z'],
      ['missing Z or offset', '2025-11-02T10:20:30'],
      ['random text', 'not-a-date'],
      ['leading space', ' 2025-11-02T10:20:30Z'],
      ['trailing space', '2025-11-02T10:20:30Z '],
      ['extra suffix', '2025-11-02T10:20:30Z#'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('rejects impossible month/day combinations (calendar-aware)', async (t) => {
    const cases = [
      ['April 31 (30-day month)', '2025-04-31T12:00:00Z'],
      ['June 31 (30-day month)', '2025-06-31T12:00:00Z'],
      ['Sep 31 (30-day month)', '2025-09-31T12:00:00Z'],
      ['Nov 31 (30-day month)', '2025-11-31T12:00:00Z'],
      ['Month 00', '2025-00-15T12:00:00Z'],
      ['Month 13', '2025-13-15T12:00:00Z'],
      ['Day 00', '2025-11-00T12:00:00Z'],
      ['Day 32', '2025-11-32T12:00:00Z'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  // --- Leap year logic ---
  test('accepts Feb 29 in leap years', async (t) => {
    const cases = [
      ['2000-02-29 (divisible by 400)', '2000-02-29T00:00:00Z'],
      ['2016-02-29 (divisible by 4)', '2016-02-29T23:59:59+01:00'],
      ['2024-02-29 (divisible by 4)', '2024-02-29T12:30:45.123Z'],
      ['1996-02-29 (divisible by 4)', '1996-02-29T12:00:00-03:30'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input)));
    }
  });

  test('rejects Feb 29 in common years (including centuries not divisible by 400)', async (t) => {
    const cases = [
      ['1900-02-29 (century not divisible by 400)', '1900-02-29T00:00:00Z'],
      ['2100-02-29 (century not divisible by 400)', '2100-02-29T00:00:00Z'],
      ['2019-02-29 (common year)', '2019-02-29T12:00:00Z'],
      ['2023-02-29 (common year)', '2023-02-29T12:00:00Z'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('accepts February 01–28 for any year; rejects Feb 30', async (t) => {
    const validCases = [
      ['Feb 01', '2025-02-01T00:00:00Z'],
      ['Feb 28', '2025-02-28T23:59:59Z'],
      ['Feb 28 (leap year still ok)', '2024-02-28T23:59:59-00:00'],
    ];
    const invalidCases = [['Feb 30', '2025-02-30T12:00:00Z']];
    for (const [label, input] of validCases) {
      await t.test(`valid ${label}`, () => assert.ok(ISO8601Regex.test(input)));
    }
    for (const [label, input] of invalidCases) {
      await t.test(`invalid ${label}`, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('rejects partial or extended ISO variants not supported by this regex', async (t) => {
    const cases = [
      ['week-date', '2025-W45-7T12:00:00Z'],
      ['ordinal date', '2025-306T12:00:00Z'],
      ['no seconds (truncated)', '2025-11-02T10:20Z'],
      ['no colon in offset', '2025-11-02T10:20:30+0100'],
      ['lowercase z', '2025-11-02T10:20:30z'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('does not allow extra characters before/after (anchors ^$)', async (t) => {
    const cases = [
      ['prefix text', 'x2025-11-02T10:20:30Z'],
      ['suffix text', '2025-11-02T10:20:30Zx'],
      ['newline suffix', '2025-11-02T10:20:30Z\n'],
      ['tab suffix', '2025-11-02T10:20:30Z\t'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('accepts a wide sample of valid datetimes to guard against regressions', async (t) => {
    const cases = [
      ['simple +Z', '1999-12-31T23:59:59Z'],
      ['mid-era -07:00', '2010-01-15T08:01:02-07:00'],
      ['offset +01:00', '2038-01-19T03:14:07+01:00'],
      ['ms .9 with -00:00', '2025-05-10T04:05:06.9-00:00'],
      ['ms .999 with +23:59', '2025-05-10T04:05:06.999+23:59'],
      ['leap 2400 Feb 29', '2400-02-29T00:00:00Z'], // far future leap century
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input)));
    }
  });
});