import type { SemanticSignature, StrudelType, StrudelTypeKind } from './types.js';

export const PATTERN_TYPE: StrudelType = { kind: 'Pattern' };
export const MINI_NOTATION_PATTERN_TYPE: StrudelType = { kind: 'MiniNotationPattern' };
export const PATTERN_METHOD_TYPE: StrudelType = { kind: 'PatternMethod' };
export const NUMBER_TYPE: StrudelType = { kind: 'Number' };
export const STRING_TYPE: StrudelType = { kind: 'String' };
export const BOOLEAN_TYPE: StrudelType = { kind: 'Boolean' };
export const ARRAY_TYPE: StrudelType = { kind: 'Array' };
export const OBJECT_TYPE: StrudelType = { kind: 'Object' };
export const UNKNOWN_TYPE: StrudelType = { kind: 'Unknown' };

export function functionType(returnType: StrudelType, signature?: SemanticSignature): StrudelType {
  return signature === undefined
    ? { kind: 'Function', returnType }
    : { kind: 'Function', returnType, signature };
}

export function patternMethodType(returnType: StrudelType): StrudelType {
  return { kind: 'PatternMethod', returnType };
}

export function strudelType(kind: StrudelTypeKind, returnType?: StrudelType): StrudelType {
  return returnType === undefined ? { kind } : { kind, returnType };
}
