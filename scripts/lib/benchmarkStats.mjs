export const PERCENTILES = [
  { name: 'p50', quantile: 0.5 },
  { name: 'p95', quantile: 0.95 },
  { name: 'p99', quantile: 0.99 },
];

export const WARMUP_ITERATIONS = 5;
export const BATCH_COUNT = 5;
export const SAMPLES_PER_BATCH = 20;
export const SAMPLE_COUNT = BATCH_COUNT * SAMPLES_PER_BATCH;

export function percentile(sortedSamples, quantile) {
  const index = Math.max(
    0,
    Math.min(sortedSamples.length - 1, Math.ceil(quantile * sortedSamples.length) - 1),
  );
  return sortedSamples[index];
}

export function round(value) {
  return Math.round(value * 1000) / 1000;
}

export function summarize(samples) {
  const sorted = [...samples].sort((left, right) => left - right);
  const summary = { min: round(sorted[0]), max: round(sorted.at(-1)) };
  for (const { name, quantile } of PERCENTILES) {
    summary[name] = percentile(sorted, quantile);
  }
  return summary;
}

export function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * A single GC or scheduling spike can dominate a p99 sample. Reporting the
 * median percentile from several independent batches preserves sustained tail
 * latency while keeping one-off pauses from becoming the committed target.
 */
export function summarizeBatches(batches) {
  const summaries = batches.map(summarize);
  const samples = batches.flat();
  const summary = {
    samples: samples.length,
    batches: batches.length,
    batchSize: SAMPLES_PER_BATCH,
    min: round(Math.min(...samples)),
    max: round(Math.max(...samples)),
  };
  for (const { name } of PERCENTILES) {
    summary[name] = round(median(summaries.map((batch) => batch[name])));
  }
  return summary;
}
