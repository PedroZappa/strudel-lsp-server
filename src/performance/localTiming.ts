import { performance } from 'node:perf_hooks';

export type LocalTimingValue = string | number | boolean;

export interface LocalTimingSample {
  readonly name: string;
  readonly durationMs?: number;
  readonly count?: number;
  readonly metadata?: Readonly<Record<string, LocalTimingValue>>;
}

export interface LocalTimingRecorder {
  record(sample: LocalTimingSample): void;
}

export interface InMemoryLocalTiming {
  readonly recorder: LocalTimingRecorder;
  samples(): readonly LocalTimingSample[];
  reset(): void;
}

const noopRecorder: LocalTimingRecorder = Object.freeze({
  record(): void {
    // Timing is disabled by default; production calls receive this no-op.
  },
});

export function disabledLocalTiming(): LocalTimingRecorder {
  return noopRecorder;
}

export function createInMemoryLocalTiming(): InMemoryLocalTiming {
  const recorded: LocalTimingSample[] = [];
  const recorder: LocalTimingRecorder = {
    record(sample): void {
      recorded.push({
        ...sample,
        metadata: sample.metadata === undefined ? undefined : { ...sample.metadata },
      });
    },
  };

  return {
    recorder,
    samples: () => [...recorded],
    reset: () => {
      recorded.length = 0;
    },
  };
}

export function recordDuration(
  recorder: LocalTimingRecorder | undefined,
  name: string,
  startMs: number,
  metadata?: Readonly<Record<string, LocalTimingValue>>,
): void {
  if (recorder === undefined) {
    return;
  }
  recorder.record({
    name,
    durationMs: performance.now() - startMs,
    metadata: metadata === undefined ? undefined : { ...metadata },
  });
}

export function recordCount(
  recorder: LocalTimingRecorder | undefined,
  name: string,
  count: number,
  metadata?: Readonly<Record<string, LocalTimingValue>>,
): void {
  if (recorder === undefined) {
    return;
  }
  recorder.record({
    name,
    count,
    metadata: metadata === undefined ? undefined : { ...metadata },
  });
}
