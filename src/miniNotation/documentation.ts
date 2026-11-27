import type { MiniNotationTokenKind } from './types.js';

/**
 * Descriptions are derived from the pinned 1.2.6 grammar and JSDoc. `!` is
 * replication, not velocity; velocity is supplied by `.gain()`/`.velocity()`.
 */
export const TOKEN_DESCRIPTIONS: Readonly<Record<MiniNotationTokenKind, string>> = {
  step: 'A step in the sequence. Whitespace-separated steps play in succession.',
  rest: 'Silence. Both `~` and `-` rest for one step.',
  number: 'A numeric step value, including decimals, negative values and exponents.',
  repeat: 'Speed up: `a*3` plays `a` three times in one cycle, equivalent to `.fast(3)`.',
  slow: 'Slow down: `a/2` stretches `a` over two cycles, equivalent to `.slow(2)`.',
  weight: 'Weight: `a@3` gives `a` three times the duration. `@` and `_` are synonyms.',
  replicate: 'Replication: `a!3` repeats `a` three times within one step. This is not velocity.',
  degrade: 'Random deletion: `a?` removes `a` with 50% probability; `a?0.8` sets the probability.',
  parallel: 'Parallel stack: `a,b` plays `a` and `b` at the same time.',
  choice: 'Random choice: `[a|b]` selects one alternative per event.',
  slice: 'List notation: `bd:0:0.3` supplies sample parameters such as `n` and `gain`.',
  range: 'Range: `0 .. 4` expands to the values between the endpoints.',
  feet: 'Feet: `a . b c` is shorthand for `a [b c]`.',
  subsequence: 'Sub-sequence: `[a b]` groups steps so they share one step of the outer sequence.',
  alternation: 'Slow alternation: `<a b>` plays one alternative per cycle.',
  polymeter: 'Polymeter: `{a b, c d e}` layers different lengths; `%n` sets steps per cycle.',
  euclid: 'Euclidean rhythm: `a(3,8)` spreads 3 pulses over 8 steps; a third value rotates it.',
  stepMarker: 'Step marker: `^[a b]` marks the first step of a sequence.',
  whitespace: 'Whitespace separates steps. Whitespace around `.` changes its meaning.',
  unknown:
    'Not recognized by the pinned 1.2.6 mini-notation token rules. No diagnostic is inferred from it during live editing.',
};
