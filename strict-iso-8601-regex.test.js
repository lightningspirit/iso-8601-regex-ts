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

  test('accepts strict time boundaries and real-world offset bounds', async (t) => {
    const cases = [
      ['lower bound time', '2025-11-02T00:00:00Z'],
      ['upper bound time', '2025-11-02T23:59:59Z'],
      ['offset +14:00', '2025-11-02T10:20:30+14:00'],
      ['offset -12:00', '2025-11-02T10:20:30-12:00'],
      ['offset -00:00', '2025-11-02T10:20:30-00:00'],
      ['offset +00:00 with ms', '2025-11-02T23:59:59.999+00:00'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input), `Expected match: ${input}`));
    }
  });

  test('rejects offsets outside real-world bounds or wrong +14:*', async (t) => {
    const cases = [
      ['offset +14:01', '2025-11-02T10:20:30+14:01'],
      ['offset +15:00', '2025-11-02T10:20:30+15:00'],
      ['offset -12:59', '2025-11-02T10:20:30-12:59'],
      ['offset -13:00', '2025-11-02T10:20:30-13:00'],
      ['offset +23:59', '2025-11-02T10:20:30+23:59'],
      ['offset -23:59', '2025-11-02T10:20:30-23:59'],
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input), `Expected no match: ${input}`));
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
      ['ms .999 with +13:59', '2025-05-10T04:05:06.999+13:59'],
      ['leap 2400 Feb 29', '2400-02-29T00:00:00Z'], // far future leap century
    ];
    for (const [label, input] of cases) {
      await t.test(label, () => assert.ok(ISO8601Regex.test(input)));
    }
  });

  test('more fractional-seconds edge cases', async (t) => {
    const ok = [
      ['ms .0',   '2025-11-02T10:20:30.0Z'],
      ['ms .00',  '2025-11-02T10:20:30.00Z'],
      ['ms .000', '2025-11-02T10:20:30.000Z'],
    ];
    const bad = [
      ['dot only',    '2025-11-02T10:20:30.Z'],
      ['ms 0 digits', '2025-11-02T10:20:30.Z'],
      ['ms 4 digits', '2025-11-02T10:20:30.0000Z'],
    ];
    for (const [label, input] of ok) {
      await t.test(`valid ${label}`, () => assert.ok(ISO8601Regex.test(input)));
    }
    for (const [label, input] of bad) {
      await t.test(`invalid ${label}`, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('offset shapes and extremes', async (t) => {
    const ok = [
      ['offset +14:00', '2025-11-02T10:20:30+14:00'],
      ['offset -12:00', '2025-11-02T10:20:30-12:00'],
    ];
    const bad = [
      ['offset hour single digit',   '2025-11-02T10:20:30+9:00'],
      ['offset minute single digit', '2025-11-02T10:20:30+09:5'],
      ['offset missing minutes',     '2025-11-02T10:20:30+09:'],
      ['offset missing colon',       '2025-11-02T10:20:30+0900'],
      ['Z with offset',              '2025-11-02T10:20:30Z+01:00'],
      ['bare plus sign',             '2025-11-02T10:20:30+'],
    ];
    for (const [label, input] of ok) {
      await t.test(`valid ${label}`, () => assert.ok(ISO8601Regex.test(input)));
    }
    for (const [label, input] of bad) {
      await t.test(`invalid ${label}`, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('additional leap-year checks', async (t) => {
    const ok = [
      ['2000-02-29 with offset', '2000-02-29T23:59:59+01:00'],
    ];
    const bad = [
      ['2200-02-29 (non-400 century)', '2200-02-29T12:00:00Z'],
    ];
    for (const [label, input] of ok) {
      await t.test(`valid ${label}`, () => assert.ok(ISO8601Regex.test(input)));
    }
    for (const [label, input] of bad) {
      await t.test(`invalid ${label}`, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('strict shape for year/month/day', async (t) => {
    const bad = [
      ['single-digit month', '2025-2-05T12:00:00Z'],
      ['single-digit day',   '2025-02-5T12:00:00Z'],
      ['2-digit year',       '25-11-02T10:20:30Z'],
      ['5-digit year',       '12025-11-02T10:20:30Z'],
    ];
    for (const [label, input] of bad) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('separator/casing strictness', async (t) => {
    const bad = [
      ['lowercase t', '2025-11-02t10:20:30Z'],
      ['lowercase z', '2025-11-02T10:20:30z'],
    ];
    for (const [label, input] of bad) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('control characters in the middle should fail', async (t) => {
    const bad = [
      ['newline in middle', '2025-11-02T10:20:\n30Z'],
      ['tab in middle',     '2025-11-02T10:\t20:30Z'],
    ];
    for (const [label, input] of bad) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('more February edge cases', async (t) => {
    const bad = [
      ['Feb 00', '2025-02-00T12:00:00Z'],
      ['Feb 31', '2025-02-31T12:00:00Z'],
    ];
    for (const [label, input] of bad) {
      await t.test(label, () => assert.ok(!ISO8601Regex.test(input)));
    }
  });

  test('redundant acceptance with milliseconds + zero offsets', async (t) => {
    const ok = [
      ['ms + -00:00', '2025-05-10T04:05:06.010-00:00'],
      ['ms + +00:00', '2025-05-10T04:05:06.000+00:00'],
    ];
    for (const [label, input] of ok) {
      await t.test(`valid ${label}`, () => assert.ok(ISO8601Regex.test(input)));
    }
  });

  test('captures: extracts named groups (Z, no fraction)', async (t) => {
    const input = '2025-11-02T10:20:30Z';
    const m = ISO8601Regex.exec(input);
    assert.ok(m, 'Expected match');
    const g = m.groups ?? {};
    const ms = g.millisecond ?? g.milisecond; // support either spelling

    assert.equal(g.year,  '2025');
    assert.equal(g.month, '11');
    assert.equal(g.day,   '02');
    assert.equal(g.hour,  '10');
    assert.equal(g.minute,'20');
    assert.equal(g.second,'30');
    assert.equal(ms,      undefined, 'no fraction → millisecond undefined');
    assert.equal(g.timezone, 'Z');
  });

  test('captures: extracts named groups (fraction + positive offset)', async (t) => {
    const input = '2038-01-19T03:14:07.045+13:59';
    const m = ISO8601Regex.exec(input);
    assert.ok(m, 'Expected match');
    const g = m.groups ?? {};
    const ms = g.millisecond ?? g.milisecond;

    assert.equal(g.year,  '2038');
    assert.equal(g.month, '01');
    assert.equal(g.day,   '19');
    assert.equal(g.hour,  '03');
    assert.equal(g.minute,'14');
    assert.equal(g.second,'07');
    assert.equal(ms,      '045');       // preserve captured digits as-is
    assert.equal(g.timezone, '+13:59');
  });

  test('captures: leap day with -12:00 offset', async (t) => {
    const input = '2000-02-29T00:00:00-12:00';
    const m = ISO8601Regex.exec(input);
    assert.ok(m, 'Expected match');
    const g = m.groups ?? {};
    const ms = g.millisecond ?? g.milisecond;

    assert.equal(g.year,  '2000');
    assert.equal(g.month, '02');
    assert.equal(g.day,   '29');
    assert.equal(g.hour,  '00');
    assert.equal(g.minute,'00');
    assert.equal(g.second,'00');
    assert.equal(ms,      undefined);
    assert.equal(g.timezone, '-12:00');
  });

  test('captures: boundaries (+14:00 and -00:00) and short fraction', async (t) => {
    const cases = [
      ['+14:00 with .5', '2024-06-10T09:08:07.5+14:00', {
        year:'2024', month:'06', day:'10', hour:'09', minute:'08', second:'07', millisecond:'5', timezone:'+14:00'
      }],
      ['-00:00, no fraction', '2025-05-10T04:05:06-00:00', {
        year:'2025', month:'05', day:'10', hour:'04', minute:'05', second:'06', millisecond:undefined, timezone:'-00:00'
      }],
    ];

    for (const [label, input, expected] of cases) {
      await t.test(label, () => {
        const m = ISO8601Regex.exec(input);
        assert.ok(m, 'Expected match');
        const g = m.groups ?? {};
        const ms = (g.millisecond ?? g.milisecond);

        assert.equal(g.year,  expected.year);
        assert.equal(g.month, expected.month);
        assert.equal(g.day,   expected.day);
        assert.equal(g.hour,  expected.hour);
        assert.equal(g.minute,expected.minute);
        assert.equal(g.second,expected.second);
        assert.equal(ms,      expected.millisecond);
        assert.equal(g.timezone, expected.timezone);
      });
    }
  });

  test('captures: exec returns null and no groups on invalid input', async (t) => {
    const bad = [
      '2025-11-02T10:20:30+14:01', // beyond allowed +14:00
      '2025-02-30T12:00:00Z',      // invalid date
      '2025-11-02 10:20:30Z',      // missing T
    ];
    for (const input of bad) {
      await t.test(input, () => {
        const m = ISO8601Regex.exec(input);
        assert.equal(m, null, 'Expected no match');
      });
    }
  });

});
