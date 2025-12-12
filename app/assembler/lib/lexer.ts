/**
 * SIC/XE Lexer
 * Tokenizes raw assembly source code into structured tokens
 */

import { TokenizedLine } from './types';
import { isValidOpcode, isDirective } from './optab';

/**
 * Tokenize a single line of assembly source code
 */
export function tokenizeLine(rawLine: string, lineNumber: number): TokenizedLine {
  const result: TokenizedLine = {
    lineNumber,
    opcode: '',
    rawLine,
    isEmpty: false,
    isComment: false,
  };

  // Trim the line
  const trimmedLine = rawLine.trim();

  // Handle empty lines
  if (trimmedLine.length === 0) {
    result.isEmpty = true;
    return result;
  }

  // Handle comment-only lines (start with .)
  if (trimmedLine.startsWith('.')) {
    result.isComment = true;
    result.comment = trimmedLine;
    return result;
  }

  // Work with a copy for processing
  let workingLine = trimmedLine;

  // Extract inline comment (anything after unquoted .)
  const commentIndex = findCommentStart(workingLine);
  if (commentIndex >= 0) {
    result.comment = workingLine.substring(commentIndex).trim();
    workingLine = workingLine.substring(0, commentIndex).trim();
  }

  // Split by whitespace, respecting quoted strings
  const tokens = splitTokens(workingLine);

  if (tokens.length === 0) {
    result.isEmpty = true;
    return result;
  }

  // Determine token positions
  // Check if the line starts with whitespace (no label)
  const startsWithWhitespace = /^\s/.test(rawLine);

  let tokenIndex = 0;

  // First token handling - determine if it's a label or opcode
  if (!startsWithWhitespace && tokens.length >= 1) {
    const firstToken = tokens[0].toUpperCase();

    // Check if first token could be a label
    // It's a label if:
    // 1. It's not in OPTAB and not a directive, OR
    // 2. There are more tokens after it and the next one is a valid opcode/directive
    const couldBeLabel = !isValidOpcode(firstToken) && !isDirective(firstToken);
    const nextIsOpcodeOrDirective = tokens.length > 1 &&
      (isValidOpcode(tokens[1]) || isDirective(tokens[1].toUpperCase()));

    if (couldBeLabel || (tokens.length > 1 && nextIsOpcodeOrDirective)) {
      result.label = tokens[0];
      tokenIndex = 1;
    }
  }

  // Next token is opcode
  if (tokenIndex < tokens.length) {
    let opcodeToken = tokens[tokenIndex].toUpperCase();

    // Check for extended format prefix (+)
    if (opcodeToken.startsWith('+')) {
      result.isExtended = true;
      opcodeToken = opcodeToken.substring(1);
    }

    result.opcode = opcodeToken;
    tokenIndex++;
  }

  // Remaining tokens form the operand
  if (tokenIndex < tokens.length) {
    // Join remaining tokens (handles cases like "BUFFER,X" split by comma)
    let operand = tokens.slice(tokenIndex).join(' ');

    // Parse addressing mode prefixes
    if (operand.startsWith('#')) {
      result.addressingPrefix = '#';
      operand = operand.substring(1);
    } else if (operand.startsWith('@')) {
      result.addressingPrefix = '@';
      operand = operand.substring(1);
    }

    // Check for indexed addressing (,X suffix)
    if (operand.toUpperCase().endsWith(',X')) {
      result.indexed = true;
      operand = operand.substring(0, operand.length - 2);
    }

    result.operand = operand;
  }

  return result;
}

/**
 * Tokenize all lines of source code
 */
export function tokenize(sourceCode: string): TokenizedLine[] {
  const lines = sourceCode.split('\n');
  return lines.map((line, index) => tokenizeLine(line, index + 1));
}

/**
 * Find the start of an inline comment (unquoted .)
 */
function findCommentStart(line: string): number {
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (!inQuote && (char === "'" || char === '"')) {
      inQuote = true;
      quoteChar = char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = '';
    } else if (!inQuote && char === '.') {
      return i;
    }
  }

  return -1;
}

/**
 * Split a line into tokens, respecting quoted strings
 */
function splitTokens(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (!inQuote && (char === "'" || char === '"')) {
      inQuote = true;
      quoteChar = char;
      current += char;
    } else if (inQuote && char === quoteChar) {
      inQuote = false;
      quoteChar = '';
      current += char;
    } else if (!inQuote && /\s/.test(char)) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += char;
    }
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Check if a string is a valid label
 * Labels must:
 * - Start with a letter
 * - Contain only alphanumeric characters
 * - Be at most 6 characters (traditional SIC limit, relaxed for SIC/XE)
 */
export function isValidLabel(label: string): boolean {
  if (!label || label.length === 0) return false;
  // Allow up to 8 characters for more modern implementations
  return /^[A-Za-z][A-Za-z0-9]{0,7}$/.test(label);
}

/**
 * Check if a string is a valid hex number
 */
export function isValidHexNumber(value: string): boolean {
  return /^[0-9A-Fa-f]+$/.test(value);
}

/**
 * Check if a string is a valid decimal number
 */
export function isValidDecimalNumber(value: string): boolean {
  return /^-?[0-9]+$/.test(value);
}

/**
 * Check if a string is a valid BYTE constant (C'...' or X'...')
 */
export function isValidByteConstant(operand: string): boolean {
  // Character constant: C'...'
  if (/^C'[^']+'$/i.test(operand)) {
    return true;
  }
  // Hex constant: X'...' with even number of hex digits
  if (/^X'[0-9A-Fa-f]+'$/i.test(operand)) {
    const hexPart = operand.slice(2, -1);
    return hexPart.length % 2 === 0;
  }
  return false;
}

/**
 * Extract the value from a BYTE constant
 */
export function extractByteConstant(operand: string): { type: 'char' | 'hex'; value: string } | null {
  if (/^C'(.+)'$/i.test(operand)) {
    const match = operand.match(/^C'(.+)'$/i);
    return match ? { type: 'char', value: match[1] } : null;
  }
  if (/^X'([0-9A-Fa-f]+)'$/i.test(operand)) {
    const match = operand.match(/^X'([0-9A-Fa-f]+)'$/i);
    return match ? { type: 'hex', value: match[1] } : null;
  }
  return null;
}

/**
 * Calculate the byte size of a BYTE constant
 */
export function calculateByteConstantSize(operand: string): number {
  const extracted = extractByteConstant(operand);
  if (!extracted) return 0;

  if (extracted.type === 'char') {
    return extracted.value.length;
  } else {
    return extracted.value.length / 2;
  }
}

/**
 * Parse a numeric operand (decimal or hex)
 */
export function parseNumericOperand(operand: string): number | null {
  if (!operand) return null;

  // Handle hex numbers (prefix with 0x or just hex digits)
  if (operand.toUpperCase().startsWith('0X')) {
    const hex = operand.substring(2);
    if (isValidHexNumber(hex)) {
      return parseInt(hex, 16);
    }
  }

  // Handle pure hex (for START directive, etc.)
  if (isValidHexNumber(operand)) {
    return parseInt(operand, 16);
  }

  // Handle decimal
  if (isValidDecimalNumber(operand)) {
    return parseInt(operand, 10);
  }

  return null;
}
