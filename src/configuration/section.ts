export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Normalizes the standard LSP configuration shapes accepted by the server.
 * Both `workspace/configuration` results and `workspace/didChangeConfiguration`
 * notifications are reduced to the `strudelLsp` settings object.
 */
export function strudelLspSection(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  let current = value;
  if (isRecord(current.settings)) {
    current = current.settings;
  }
  if (isRecord(current.strudelLsp)) {
    current = current.strudelLsp;
  }
  return current;
}
