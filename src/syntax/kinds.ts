import type { SyntaxKind } from './types.js';

/**
 * Parser node names observed from `tree-sitter-strudel@2.0.2` node type
 * metadata. These names stay inside this file; other layers receive only the
 * stable `SyntaxKind` values.
 */
const PARSER_KINDS: Readonly<Record<string, SyntaxKind>> = {
  arguments: 'arguments',
  array: 'array',
  array_pattern: 'arrayPattern',
  arrow_function: 'arrowFunction',
  assignment_expression: 'assignmentExpression',
  assignment_pattern: 'assignmentPattern',
  await_expression: 'awaitExpression',
  binary_expression: 'binaryExpression',
  block: 'block',
  call_expression: 'callExpression',
  comment: 'comment',
  computed_property_name: 'computedPropertyName',
  conditional_expression: 'conditionalExpression',
  export_declaration: 'exportDeclaration',
  expression_statement: 'expressionStatement',
  formal_parameters: 'formalParameters',
  function_declaration: 'functionDeclaration',
  identifier: 'identifier',
  import_declaration: 'importDeclaration',
  import_specifier: 'importSpecifier',
  labeled_statement: 'labeledStatement',
  member_expression: 'memberExpression',
  named_imports: 'namedImports',
  new_expression: 'newExpression',
  number: 'number',
  object: 'object',
  pair: 'pair',
  parenthesized_expression: 'parenthesizedExpression',
  return_statement: 'returnStatement',
  source_file: 'sourceFile',
  spread_element: 'spreadElement',
  string: 'string',
  subscript_expression: 'subscriptExpression',
  tagged_template_expression: 'taggedTemplateExpression',
  template_string: 'templateString',
  template_substitution: 'templateSubstitution',
  try_statement: 'tryStatement',
  unary_expression: 'unaryExpression',
  variable_declaration: 'variableDeclaration',
  variable_declarator: 'variableDeclarator',
};

export function normalizeKind(parserType: string, isNamed: boolean, isError: boolean): SyntaxKind {
  if (isError) {
    return 'error';
  }

  const stableKind = PARSER_KINDS[parserType];
  if (stableKind !== undefined) {
    return stableKind;
  }

  return isNamed ? 'unknown' : 'token';
}
