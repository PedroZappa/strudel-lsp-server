import {
  functionType,
  patternMethodType,
  strudelType,
  UNKNOWN_TYPE,
  type SemanticCatalog,
  type SemanticCatalogEntry,
  type StrudelType,
  type StrudelTypeKind,
} from '../semantic/index.js';

import type { LanguageDatabase, LanguageMetadataRecord } from './types.js';

function returnTypeOf(kind: StrudelTypeKind): StrudelType {
  return kind === 'Function' ? functionType(UNKNOWN_TYPE) : strudelType(kind);
}

function globalEntry(record: LanguageMetadataRecord): SemanticCatalogEntry {
  return {
    kind: 'function',
    type: functionType(returnTypeOf(record.returnType)),
    miniNotationArguments: record.miniNotationArguments,
  };
}

function methodEntry(record: LanguageMetadataRecord): SemanticCatalogEntry {
  return {
    kind: 'method',
    type: patternMethodType(returnTypeOf(record.returnType)),
    miniNotationArguments: record.miniNotationArguments,
  };
}

function sampleEntry(record: LanguageMetadataRecord): SemanticCatalogEntry {
  return {
    kind: 'sample',
    type: returnTypeOf(record.returnType),
    miniNotationArguments: record.miniNotationArguments,
  };
}

export function createCatalogFromLanguageDatabase(
  database: LanguageDatabase,
  version?: string,
): SemanticCatalog {
  const snapshot = database.getSnapshot(version);

  return {
    version: snapshot.catalogVersion,
    getGlobal: (name) => {
      const record = database.getGlobalRecord(name, snapshot.version);
      return record === undefined ? undefined : globalEntry(record);
    },
    getMethod: (name, receiverType) => {
      if (receiverType.kind !== 'Pattern') {
        return undefined;
      }
      const record = database.getMethodRecord(name, snapshot.version);
      return record === undefined ? undefined : methodEntry(record);
    },
    getSample: (name) => {
      const record = database.getSampleRecord(name, snapshot.version);
      return record === undefined ? undefined : sampleEntry(record);
    },
  };
}
