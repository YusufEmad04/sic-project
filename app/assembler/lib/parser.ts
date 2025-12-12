/**
 * SIC/XE Parser
 * Validates tokenized lines and checks for syntax errors
 */

import { TokenizedLine, AssemblerError } from './types';
import {
  isValidOpcode,
  isDirective,
  getOpcodeEntry,
  getRegisterCode,
  canBeExtended,
  isFormat2Instruction
} from './optab';
import {
  isValidLabel,
  isValidByteConstant,
  isValidDecimalNumber,
  isValidHexNumber
} from './lexer';

/**
 * Result of parsing a single line
 */
export interface ParseResult {
  valid: boolean;
  line: TokenizedLine;
  errors: string[];
  warnings: string[];
}

/**
 * Parse and validate a single tokenized line
 */
export function parseLine(line: TokenizedLine): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip empty lines and comments - they are always valid
  if (line.isEmpty || line.isComment) {
    return { valid: true, line, errors, warnings };
  }

  // Validate label if present
  if (line.label) {
    if (!isValidLabel(line.label)) {
      errors.push(`Invalid label format: "${line.label}". Labels must start with a letter and contain only alphanumeric characters.`);
    }
  }

  // Validate opcode
  if (!line.opcode || line.opcode.length === 0) {
    errors.push('Missing opcode');
    return { valid: false, line, errors, warnings };
  }

  const opcode = line.opcode.toUpperCase();

  // Check if it's a valid opcode or directive
  if (!isValidOpcode(opcode) && !isDirective(opcode)) {
    errors.push(`Invalid opcode: "${opcode}"`);
    return { valid: false, line, errors, warnings };
  }

  // Validate extended format usage
  if (line.isExtended) {
    if (!canBeExtended(opcode)) {
      errors.push(`Instruction "${opcode}" cannot use extended format (+). Only Format 3 instructions support Format 4.`);
    }
  }

  // Validate based on instruction type
  if (isDirective(opcode)) {
    validateDirective(opcode, line, errors, warnings);
  } else {
    validateInstruction(opcode, line, errors, warnings);
  }

  return {
    valid: errors.length === 0,
    line,
    errors,
    warnings
  };
}

/**
 * Validate a directive
 */
function validateDirective(
  directive: string,
  line: TokenizedLine,
  errors: string[],
  warnings: string[]
): void {
  const operand = line.operand;

  switch (directive) {
    case 'START':
      if (!operand) {
        warnings.push('START without address, defaulting to 0');
      } else if (!isValidHexNumber(operand)) {
        errors.push('START requires a valid hexadecimal address');
      }
      break;

    case 'END':
      // END can have an optional operand (first executable instruction)
      // If present, it should be a valid symbol or address
      break;

    case 'BYTE':
      if (!operand) {
        errors.push('BYTE requires an operand');
      } else if (!isValidByteConstant(operand)) {
        errors.push(`Invalid BYTE constant: "${operand}". Use C'...' for characters or X'...' for hex.`);
      }
      break;

    case 'WORD':
      if (!operand) {
        errors.push('WORD requires an operand');
      } else if (!isValidDecimalNumber(operand) && !isValidHexNumber(operand)) {
        // Could be a symbol, which is okay
        if (!isValidLabel(operand)) {
          errors.push(`Invalid WORD value: "${operand}". Use a number or valid symbol.`);
        }
      }
      break;

    case 'RESB':
      if (!operand) {
        errors.push('RESB requires a positive integer operand');
      } else if (!isValidDecimalNumber(operand) || parseInt(operand, 10) <= 0) {
        errors.push(`RESB requires a positive integer, got: "${operand}"`);
      }
      break;

    case 'RESW':
      if (!operand) {
        errors.push('RESW requires a positive integer operand');
      } else if (!isValidDecimalNumber(operand) || parseInt(operand, 10) <= 0) {
        errors.push(`RESW requires a positive integer, got: "${operand}"`);
      }
      break;

    case 'BASE':
      if (!operand) {
        errors.push('BASE requires an operand (symbol or address)');
      }
      break;

    case 'NOBASE':
      if (operand) {
        warnings.push('NOBASE does not take an operand, ignoring');
      }
      break;

    case 'EQU':
      if (!operand) {
        errors.push('EQU requires an operand');
      }
      if (!line.label) {
        errors.push('EQU requires a label');
      }
      break;

    case 'ORG':
      if (!operand) {
        errors.push('ORG requires an address operand');
      }
      break;

    case 'LTORG':
      if (operand) {
        warnings.push('LTORG does not take an operand, ignoring');
      }
      break;
  }
}

/**
 * Validate an instruction
 */
function validateInstruction(
  opcode: string,
  line: TokenizedLine,
  errors: string[],
  warnings: string[]
): void {
  const entry = getOpcodeEntry(opcode);

  if (!entry) {
    errors.push(`Unknown instruction: "${opcode}"`);
    return;
  }

  const operand = line.operand;

  // Check operand requirements
  if (entry.operands === 0) {
    // No operand expected (e.g., RSUB, FIX, FLOAT)
    if (operand) {
      warnings.push(`Instruction "${opcode}" does not take an operand, ignoring "${operand}"`);
    }
  } else if (entry.operands >= 1) {
    // Operand required
    if (!operand) {
      errors.push(`Instruction "${opcode}" requires an operand`);
      return;
    }

    // Format 2 instructions need register operands
    if (isFormat2Instruction(opcode)) {
      validateFormat2Operands(opcode, operand, entry.operands, errors);
    }
  }

  // Check for invalid addressing mode combinations
  if (line.addressingPrefix && line.indexed) {
    if (line.addressingPrefix === '#') {
      errors.push('Cannot use immediate addressing (#) with indexed addressing (,X)');
    }
    // Indirect + indexed is technically valid in some cases but unusual
  }
}

/**
 * Validate Format 2 instruction operands (registers)
 */
function validateFormat2Operands(
  opcode: string,
  operand: string,
  expectedCount: number,
  errors: string[]
): void {
  // Split by comma
  const parts = operand.split(',').map(p => p.trim().toUpperCase());

  if (expectedCount === 1) {
    // Single register (CLEAR, TIXR, SVC)
    if (parts.length !== 1) {
      errors.push(`${opcode} expects 1 register operand, got ${parts.length}`);
      return;
    }

    if (opcode === 'SVC') {
      // SVC takes a number, not a register
      if (!isValidDecimalNumber(parts[0])) {
        errors.push(`SVC expects a decimal number operand`);
      }
    } else {
      if (getRegisterCode(parts[0]) === null) {
        errors.push(`Invalid register: "${parts[0]}"`);
      }
    }
  } else if (expectedCount === 2) {
    // Two registers (ADDR, COMPR, etc.)
    if (parts.length !== 2) {
      errors.push(`${opcode} expects 2 register operands (r1,r2), got ${parts.length}`);
      return;
    }

    // SHIFTL and SHIFTR take register and number
    if (opcode === 'SHIFTL' || opcode === 'SHIFTR') {
      if (getRegisterCode(parts[0]) === null) {
        errors.push(`Invalid register: "${parts[0]}"`);
      }
      if (!isValidDecimalNumber(parts[1])) {
        errors.push(`${opcode} expects a shift count as second operand`);
      }
    } else {
      // Both should be registers
      if (getRegisterCode(parts[0]) === null) {
        errors.push(`Invalid first register: "${parts[0]}"`);
      }
      if (getRegisterCode(parts[1]) === null) {
        errors.push(`Invalid second register: "${parts[1]}"`);
      }
    }
  }
}

/**
 * Parse all tokenized lines
 */
export function parseAll(lines: TokenizedLine[]): {
  results: ParseResult[];
  errors: AssemblerError[];
  success: boolean;
} {
  const results: ParseResult[] = [];
  const errors: AssemblerError[] = [];

  for (const line of lines) {
    const result = parseLine(line);
    results.push(result);

    // Collect errors
    for (const error of result.errors) {
      errors.push({
        lineNumber: line.lineNumber,
        message: error,
        type: 'error',
        phase: 'parser'
      });
    }

    // Collect warnings as well
    for (const warning of result.warnings) {
      errors.push({
        lineNumber: line.lineNumber,
        message: warning,
        type: 'warning',
        phase: 'parser'
      });
    }
  }

  const hasErrors = errors.some(e => e.type === 'error');

  return {
    results,
    errors,
    success: !hasErrors
  };
}
