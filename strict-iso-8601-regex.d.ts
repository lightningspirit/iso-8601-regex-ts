// index.d.ts

/**
 * Strict regular expression for validating complete ISO 8601 date-time strings.
 *
 * This pattern enforces full calendar correctness (leap-year rules and valid day ranges),
 * as well as strict time and timezone formatting.
 *
 * Supported format:
 *   YYYY-MM-DDTHH:mm:ss(.SSS)?(Z|±HH:MM)
 *
 * Valid examples:
 * - "2025-11-02T10:20:30Z"                // UTC time
 * - "2025-11-02T10:20:30.123Z"            // With milliseconds
 * - "2025-11-02T10:20:30+01:00"           // With positive offset
 * - "2024-02-29T12:00:00Z"                // Leap year (Feb 29 allowed)
 *
 * Invalid examples:
 * - "2025-11-02T10:20:30"                 // Missing timezone
 * - "2025-04-31T12:00:00Z"                // Invalid day for April
 * - "1900-02-29T00:00:00Z"                // 1900 not a leap year
 * - "2025-11-02T24:00:00Z"                // Invalid hour
 * - "2025-11-02T10:20:30.1234Z"           // Too many milliseconds
 * - "2025-11-02 10:20:30Z"                // Space instead of 'T'
 *
 * ### Enforcement rules
 * - Year: 0000–9999
 * - Month: 01–12
 * - Day: per month (01–31, 30-day months restricted, Feb 29 allowed only on leap years)
 * - Hour: 00–23
 * - Minute: 00–59
 * - Second: 00–59
 * - Milliseconds: optional, 1–3 digits
 * - Timezone: "Z" (UTC) or ±HH:MM (offset hours 00–23, minutes 00–59)
 * - Anchored (`^...$`): no leading or trailing whitespace or extra characters allowed
 *
 * ### Leap-year logic
 * Leap years match the Gregorian calendar:
 * - Divisible by 4 → leap year
 * - Divisible by 100 → not a leap year
 * - Divisible by 400 → leap year again
 *
 * @constant
 * @type {RegExp}
 * @example
 * ISO8601Regex.test('2025-11-02T10:20:30Z'); // true
 * ISO8601Regex.test('2025-04-31T12:00:00Z'); // false
 */
export declare const ISO8601Regex: RegExp;
