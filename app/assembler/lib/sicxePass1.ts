/**
 * SIC/XE Pass 1 Algorithm
 * Builds symbol table, assigns addresses, generates intermediate file
 */

import {
  TokenizedLine,
  SymbolTable,
  IntermediateEntry,
  Pass1Result,
  AssemblerError
} from './types';
import {
  isDirective,
  getInstructionFormat,
  isValidOpcode
} from './optab';
import {
  calculateByteConstantSize,
  parseNumericOperand,
  isValidDecimalNumber
} from './lexer';

/**
 * Execute Pass 1 of the assembler
 * 
 * Tasks:
 * 1. Initialize LOCCTR to starting address
 * 2. For each line:
 *    - If label exists, add to SYMTAB with current LOCCTR
 *    - Determine instruction/directive size
 *    - Increment LOCCTR
 * 3. Generate intermediate file with LOCCTR for each line
 * 4. Calculate program length
 */
export function executePass1(lines: TokenizedLine[]): Pass1Result {
  const symbolTable: SymbolTable = {};
  const intermediateFile: IntermediateEntry[] = [];
  const errors: AssemblerError[] = [];

  let locctr = 0;
  let startAddress = 0;
  let programName = 'PROG';
  let foundStart = false;
  let foundEnd = false;

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.isEmpty || line.isComment) {
      intermediateFile.push({
        line: { ...line, location: undefined },
        locctr: null,
        size: 0
      });
      continue;
    }

    const opcode = line.opcode.toUpperCase();

    // Handle START directive
    if (opcode === 'START') {
      if (foundStart) {
        errors.push({
          lineNumber: line.lineNumber,
          message: 'Duplicate START directive',
          type: 'error',
          phase: 'pass1'
        });
      }

      foundStart = true;
      startAddress = parseNumericOperand(line.operand || '0') || 0;
      locctr = startAddress;
      programName = line.label || 'PROG';

      intermediateFile.push({
        line: { ...line, location: locctr },
        locctr: locctr,
        size: 0,
        symbolTableSnapshot: { ...symbolTable }
      });
      continue;
    }

    // Handle END directive
    if (opcode === 'END') {
      foundEnd = true;

      intermediateFile.push({
        line: { ...line, location: locctr },
        locctr: locctr,
        size: 0,
        symbolTableSnapshot: { ...symbolTable }
      });
      break; // Stop processing after END
    }

    // Save current location for this line
    const currentLocctr = locctr;

    // Process label - add to symbol table
    if (line.label) {
      const label = line.label.toUpperCase();

      if (label in symbolTable) {
        errors.push({
          lineNumber: line.lineNumber,
          message: `Duplicate symbol: "${label}" (previously defined at address ${symbolTable[label].toString(16).toUpperCase()})`,
          type: 'error',
          phase: 'pass1'
        });
      } else {
        symbolTable[label] = locctr;
      }
    }

    // Calculate size and increment LOCCTR
    const size = calculateInstructionSize(line, errors);

    // Add to intermediate file
    intermediateFile.push({
      line: { ...line, location: currentLocctr },
      locctr: currentLocctr,
      size: size,
      symbolTableSnapshot: { ...symbolTable }
    });

    locctr += size;
  }

  // Validate we found START and END
  if (!foundEnd) {
    errors.push({
      lineNumber: lines.length,
      message: 'Missing END directive',
      type: 'warning',
      phase: 'pass1'
    });
  }

  const programLength = locctr - startAddress;

  return {
    intermediateFile,
    symbolTable,
    programName,
    startAddress,
    programLength,
    errors,
    success: !errors.some(e => e.type === 'error')
  };
}

/**
 * Calculate the size of an instruction or directive in bytes
 */
function calculateInstructionSize(line: TokenizedLine, errors: AssemblerError[]): number {
  const opcode = line.opcode.toUpperCase();
  const isExtended = line.isExtended || line.opcode.startsWith('+');
  const cleanOpcode = opcode.replace(/^\+/, '');

  // Handle directives
  if (isDirective(cleanOpcode)) {
    return calculateDirectiveSize(cleanOpcode, line.operand, line.lineNumber, errors);
  }

  // Handle instructions
  if (isValidOpcode(cleanOpcode)) {
    const format = getInstructionFormat(isExtended ? '+' + cleanOpcode : cleanOpcode);
    return format;
  }

  // Unknown opcode
  errors.push({
    lineNumber: line.lineNumber,
    message: `Unknown opcode: "${opcode}"`,
    type: 'error',
    phase: 'pass1'
  });

  return 0;
}

/**
 * Calculate the size of a directive
 */
function calculateDirectiveSize(
  directive: string,
  operand: string | undefined,
  lineNumber: number,
  errors: AssemblerError[]
): number {
  switch (directive) {
    case 'START':
    case 'END':
    case 'BASE':
    case 'NOBASE':
    case 'LTORG':
      return 0;

    case 'BYTE':
      if (!operand) {
        errors.push({
          lineNumber,
          message: 'BYTE directive requires an operand',
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      return calculateByteConstantSize(operand);

    case 'WORD':
      return 3; // Words are always 3 bytes in SIC/XE

    case 'RESB':
      if (!operand || !isValidDecimalNumber(operand)) {
        errors.push({
          lineNumber,
          message: 'RESB requires a positive integer operand',
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      return parseInt(operand, 10);

    case 'RESW':
      if (!operand || !isValidDecimalNumber(operand)) {
        errors.push({
          lineNumber,
          message: 'RESW requires a positive integer operand',
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      return parseInt(operand, 10) * 3; // Each word is 3 bytes

    case 'EQU':
      return 0; // EQU doesn't take space

    case 'ORG':
      return 0; // ORG doesn't take space, but changes LOCCTR (handled separately)

    default:
      return 0;
  }
}

/**
 * Format an address as a hex string
 */
export function formatAddress(address: number, digits: number = 4): string {
  return address.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * Get symbol table as formatted string for display
 */
export function formatSymbolTable(symbolTable: SymbolTable): string {
  const entries = Object.entries(symbolTable)
    .sort((a, b) => a[1] - b[1])
    .map(([name, address]) => `${name.padEnd(8)} ${formatAddress(address, 6)}`);

  return entries.join('\n');
}
