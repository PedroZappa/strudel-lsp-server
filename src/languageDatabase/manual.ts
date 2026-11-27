import type { ManualSemanticSnapshot } from './types.js';

/**
 * Curated semantics that cannot be derived reliably from @strudel/reference JSDoc alone.
 * Evidence refers to the pinned reference record examples for each long name.
 */
export const manualSemanticSnapshot = {
  schemaVersion: 1,
  entries: [
    {
      longName: 's',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd hh")', 's("bd:0 bd:1 bd:0:0.3 bd:1:1.4")'],
    },
    {
      longName: 'note',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['note("c a f e")', 'note("c4 a4 f4 e4")'],
    },
    {
      longName: 'n',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd sd [~ bd] sd,hh*6").n("<0 1>")'],
    },
    {
      longName: 'chord',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['chord("<Am C D F Am E Am E>").voicing()'],
    },
    {
      longName: 'arp',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['note("<[c,eb,g]!2 [c,f,ab] [d,f,ab]>").arp("0 [0,2] 1 [0,2]")'],
    },
    {
      longName: 'scale',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['n("0 2 4 6 4 2").scale("C:major")', '.scale("C:<major minor>/2")'],
    },
    {
      longName: 'speed',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd*6").speed("1 2 4 1 -2 -4")', 'speed("1 1.5*2 [2 1.1]").s("piano").clip(1)'],
    },
    {
      longName: 'gain',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("hh*8").gain(".4!2 1 .4!2 1 .4 1").fast(2)'],
    },
    {
      longName: 'lpf',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd sd [~ bd] sd,hh*6").lpf("<4000 2000 1000 500 200 100>")'],
    },
    {
      longName: 'hpf',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd sd [~ bd] sd,hh*8").hpf("<4000 2000 1000 500 200 100>")'],
    },
    {
      longName: 'pan',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("[bd hh]*2").pan("<.5 1 .5 0>")'],
    },
    {
      longName: 'delay',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd bd").delay("<0 .25 .5 1>")'],
    },
    {
      longName: 'room',
      returnType: 'Pattern',
      miniNotationArguments: [0],
      evidence: ['s("bd sd [~ bd] sd").room("<0 .2 .4 .6 .8 1>")'],
    },
    {
      longName: 'cat',
      returnType: 'Pattern',
      evidence: ['cat("e5", "b4", ["d5", "c5"]).note()'],
    },
    {
      longName: 'stack',
      returnType: 'Pattern',
      evidence: ['stack("g3", "b3", ["e4", "d4"]).note()'],
    },
  ],
} satisfies ManualSemanticSnapshot;
