const assert = require("node:assert/strict");
const { ISO8601Regex } = require("./strict-iso-8601-regex.cjs");
const { describe } = require("node:test");

describe("ISO8601Regex — CommonJS import", () => {
  // Basic tests
  const validCases = [
    "2025-11-02T10:20:30Z",
    "2025-11-02T10:20:30.123Z",
    "2024-02-29T12:00:00Z",
    "2025-11-02T10:20:30+01:00",
  ];

  const invalidCases = [
    "2025-11-02T10:20:30",
    "2025-04-31T12:00:00Z",
    "1900-02-29T00:00:00Z",
  ];

  validCases.forEach((testCase) => {
    assert.ok(ISO8601Regex.test(testCase), `Valid case failed: ${testCase}`);
  });

  invalidCases.forEach((testCase) => {
    assert.ok(
      !ISO8601Regex.test(testCase),
      `Invalid case incorrectly accepted: ${testCase}`
    );
  });

  // Test named captures
  const testInput = "2025-11-02T10:20:30.123+05:30";
  const match = ISO8601Regex.exec(testInput);
  assert.ok(match && match.groups, "Failed to extract named groups");

  const { year, month, day, hour, minute, second, millisecond, timezone } =
    match.groups;

  assert.strictEqual(year, "2025", "Year capture failed");
  assert.strictEqual(month, "11", "Month capture failed");
  assert.strictEqual(day, "02", "Day capture failed");
  assert.strictEqual(hour, "10", "Hour capture failed");
  assert.strictEqual(minute, "20", "Minute capture failed");
  assert.strictEqual(second, "30", "Second capture failed");
  assert.strictEqual(millisecond, "123", "Millisecond capture failed");
  assert.strictEqual(timezone, "+05:30", "Timezone capture failed");
});
