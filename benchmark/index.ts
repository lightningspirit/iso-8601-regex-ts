import { Bench } from 'tinybench'
import validator from 'validator'
import { DateTime } from 'luxon'
import fc from 'fast-check'
import { z } from 'zod'
import AjvImport from 'ajv'
import addFormatsImport from 'ajv-formats'
import { parseISO, isValid } from 'date-fns'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat.js'

import { ISO8601Regex } from '../strict-iso-8601-regex.js'

dayjs.extend(customParseFormat)

const Ajv = ((AjvImport as unknown as { default?: typeof AjvImport }).default ?? AjvImport) as unknown as new (...args: unknown[]) => { compile: (s: unknown) => (v: unknown) => boolean }
const addFormats = ((addFormatsImport as unknown as { default?: typeof addFormatsImport }).default ?? addFormatsImport) as unknown as (ajv: unknown) => void

const ajv = new Ajv()
addFormats(ajv)
const ajvValidate = ajv.compile({
  type: 'string',
  format: 'date-time',
})

const zodSchema = z.iso.datetime({
  offset: true,
})

const BENCH_OPTIONS = {
  time: 300,
  warmup: true,
  warmupIterations: 50,
}

const DATASET_SIZE = 1_000
const INVALID_DATASET_SIZE = 1_000
const FUZZY_SAMPLE_SIZE = 1_000

/**
 * Fisher–Yates shuffle (in place). Used so that the bench loop sees
 * datasets in different orders across runs, reducing V8 inline-cache
 * specialization on a fixed input sequence.
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(
      Math.random() * (i + 1),
    )
    ;[arr[i], arr[j]] = [arr[j]!, arr[i]!]
  }
  return arr
}

/**
 * VALID DATASET
 *
 * Mix of formats to exercise different regex branches:
 * - UTC `Z`
 * - positive and negative timezone offsets
 * - with and without fractional seconds (1–3 digits)
 * - leap-year February 29
 */
const VALID_FORMATS = [
  (d: string) => `2025-01-${d}T10:30:00Z`,
  (d: string) =>
    `2025-06-${d}T10:30:00.5+09:30`,
  (d: string) =>
    `2024-02-${d}T23:59:59.123-12:00`,
  (d: string) =>
    `2000-11-${d}T00:00:00.999+14:00`,
  (d: string) => `2038-03-${d}T03:14:07Z`,
]

const VALID_DATASET = shuffle(
  Array.from(
    { length: DATASET_SIZE },
    (_, i) => {
      const day = String(
        (i % 28) + 1,
      ).padStart(2, '0')
      return VALID_FORMATS[
        i % VALID_FORMATS.length
      ]!(day)
    },
  ),
)

/**
 * INVALID DATASET
 */
const INVALID_DATASET = shuffle(
  Array.from(
    { length: INVALID_DATASET_SIZE },
    (_, i) =>
      `2025-99-${String(
        (i % 28) + 1,
      ).padStart(2, '0')}`,
  ),
)

/**
 * FUZZY / ADVERSARIAL DATASET
 */
const FUZZY_EVIL_DATASET = shuffle(
  fc.sample(
  fc.oneof(
    /**
     * Completely random strings
     */
    fc.string({
      minLength: 100,
      maxLength: 10_000,
    }),

    /**
     * Almost-valid dates
     */
    fc.constantFrom(
      '2025-99-99',
      '2025-13-01',
      '2025-00-00',
      '2025-02-30',
      '9999-99-99T99:99:99Z',
      '2025-12-31T25:61:61Z',
    ),

    /**
     * Large fractional seconds
     */
    fc
      .string({
        minLength: 1000,
        maxLength: 10_000,
      })
      .map(
        s =>
          `2025-12-31T23:59:59.${s}X`,
      ),

    /**
     * Large timezone payloads
     */
    fc
      .string({
        minLength: 1000,
        maxLength: 10_000,
      })
      .map(
        s =>
          `2025-12-31T23:59:59+99:99${s}`,
      ),

    /**
     * Repeated near-matches
     */
    fc.integer({
      min: 10,
      max: 1000,
    }).map(
      n =>
        '2025-12-31T23:59:59.'.repeat(
          n,
        ),
    ),

    fc.integer({
      min: 10,
      max: 1000,
    }).map(
      n =>
        '2025-12-31T23:59:59+'
          .repeat(n),
    ),
  ),
  FUZZY_SAMPLE_SIZE,
  ),
)

let sink = 0

/**
 * BENCH HELPERS
 */
function benchmarkRegex(
  dataset: string[],
) {
  for (const date of dataset) {
    if (ISO8601Regex.test(date)) {
      sink++
    }
  }
}

function benchmarkValidator(
  dataset: string[],
) {
  for (const date of dataset) {
    if (validator.isISO8601(date)) {
      sink++
    }
  }
}

function benchmarkLuxon(
  dataset: string[],
) {
  for (const date of dataset) {
    if (DateTime.fromISO(date).isValid) {
      sink++
    }
  }
}

function benchmarkDateParse(
  dataset: string[],
) {
  for (const date of dataset) {
    if (!Number.isNaN(Date.parse(date))) {
      sink++
    }
  }
}

function benchmarkZod(
  dataset: string[],
) {
  for (const date of dataset) {
    if (zodSchema.safeParse(date).success) {
      sink++
    }
  }
}

function benchmarkAjv(
  dataset: string[],
) {
  for (const date of dataset) {
    if (ajvValidate(date)) {
      sink++
    }
  }
}

function benchmarkDateFns(
  dataset: string[],
) {
  for (const date of dataset) {
    if (isValid(parseISO(date))) {
      sink++
    }
  }
}

function benchmarkDayjs(
  dataset: string[],
) {
  for (const date of dataset) {
    if (
      dayjs(
        date,
        [
          'YYYY-MM-DDTHH:mm:ssZ',
          'YYYY-MM-DDTHH:mm:ss.SSSZ',
        ],
        true,
      ).isValid()
    ) {
      sink++
    }
  }
}

/**
 * LATENCY CHECK
 */
function measureWorstCaseLatency(
  title: string,
  dataset: string[],
) {
  let max = 0
  let slowest = ''

  for (const input of dataset) {
    const start = performance.now()

    ISO8601Regex.test(input)

    const elapsed =
      performance.now() - start

    if (elapsed > max) {
      max = elapsed
      slowest = input.slice(0, 120)
    }
  }

  console.log(`\n=== ${title} ===`)
  console.log(
    'Worst latency:',
    `${max.toFixed(4)} ms`,
  )

  console.log(
    'Slowest input preview:',
    slowest,
  )
}

type BenchEntry = {
  name: string
  kind: 'validator' | 'parser'
  fn: (dataset: string[]) => void
}

const ALL: BenchEntry[] = [
  {
    name: 'iso-8601-regex',
    kind: 'validator',
    fn: benchmarkRegex,
  },
  {
    name: 'validator.js',
    kind: 'validator',
    fn: benchmarkValidator,
  },
  {
    name: 'zod',
    kind: 'validator',
    fn: benchmarkZod,
  },
  {
    name: 'ajv',
    kind: 'validator',
    fn: benchmarkAjv,
  },
  {
    name: 'Date.parse',
    kind: 'parser',
    fn: benchmarkDateParse,
  },
  {
    name: 'luxon',
    kind: 'parser',
    fn: benchmarkLuxon,
  },
  {
    name: 'date-fns',
    kind: 'parser',
    fn: benchmarkDateFns,
  },
  {
    name: 'dayjs',
    kind: 'parser',
    fn: benchmarkDayjs,
  },
]

/**
 * MEMORY MEASUREMENT
 *
 * Approximate per-validation heap allocation. Requires running node with
 * `--expose-gc` for stable numbers; otherwise reports best-effort deltas.
 */
function measureMemory(
  entry: BenchEntry,
  dataset: string[],
  iterations: number,
): number {
  const gc = (
    globalThis as unknown as {
      gc?: () => void
    }
  ).gc

  if (gc) {
    gc()
    gc()
  }

  const before =
    process.memoryUsage().heapUsed

  for (let i = 0; i < iterations; i++) {
    entry.fn(dataset)
  }

  if (gc) {
    gc()
    gc()
  }

  const after =
    process.memoryUsage().heapUsed
  const totalValidations =
    dataset.length * iterations
  const heapDelta = Math.max(
    0,
    after - before,
  )

  return (
    heapDelta / totalValidations
  )
}

/**
 * BENCH RUNNER
 */
async function runBench(
  title: string,
  dataset: string[],
  iterations = 1,
) {
  const bench = new Bench(BENCH_OPTIONS)

  for (const entry of ALL) {
    bench.add(entry.name, () => {
      for (
        let i = 0;
        i < iterations;
        i++
      ) {
        entry.fn(dataset)
      }
    })
  }

  await bench.run()

  const memSamples = 3
  const memPerName = new Map<
    string,
    number
  >()
  for (const entry of ALL) {
    let total = 0
    for (let i = 0; i < memSamples; i++) {
      total += measureMemory(
        entry,
        dataset,
        iterations,
      )
    }
    memPerName.set(
      entry.name,
      total / memSamples,
    )
  }

  const kindByName = new Map(
    ALL.map(e => [e.name, e.kind]),
  )

  const rawTable = bench.table()

  rawTable.sort((a, b) => {
    const aOps = Number.parseFloat(
      String(
        a!['Throughput avg (ops/s)'],
      ).replace(/[^\d.]/g, ''),
    )

    const bOps = Number.parseFloat(
      String(
        b!['Throughput avg (ops/s)'],
      ).replace(/[^\d.]/g, ''),
    )

    return bOps - aOps
  })

  const table = rawTable.map(row => {
    if (!row) return row
    const name = String(row['Task name'])
    const mem = memPerName.get(name) ?? 0
    return {
      ...row,
      Kind: kindByName.get(name),
      'Heap bytes / validation':
        mem.toFixed(1),
    }
  })

  console.log(`\n=== ${title} ===`)
  console.log(
    `(each task op = ${
      dataset.length * iterations
    } validations; divide ns by that for per-validation latency)\n`,
  )
  console.table(table)
}

/**
 * PROPERTY / FUZZ TEST
 */
function runFuzzPropertyTest() {
  console.log(
    '\n=== PROPERTY FUZZ TEST ===\n',
  )

  fc.assert(
    fc.property(fc.string(), value => {
      ISO8601Regex.test(value)

      return true
    }),
    {
      numRuns: 10_000,
    },
  )

  console.log(
    '✓ No crashes / hangs detected',
  )
}

/**
 * EXECUTION
 */

await runBench(
  'VALID INPUTS',
  VALID_DATASET,
)

await runBench(
  'INVALID INPUTS',
  INVALID_DATASET,
)

await runBench(
  'FUZZY EVIL INPUTS',
  FUZZY_EVIL_DATASET,
  1,
)

measureWorstCaseLatency(
  'FUZZY EVIL LATENCY',
  FUZZY_EVIL_DATASET,
)

runFuzzPropertyTest()

console.log('\nsink:', sink)
