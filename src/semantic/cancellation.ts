import type { SemanticCancellationToken } from './types.js';

export class SemanticAnalysisCancelledError extends Error {
  readonly name = 'SemanticAnalysisCancelledError';

  constructor() {
    super('Semantic analysis was cancelled');
  }
}

export function throwIfCancelled(token: SemanticCancellationToken | undefined): void {
  if (token?.isCancellationRequested === true) {
    throw new SemanticAnalysisCancelledError();
  }
}
