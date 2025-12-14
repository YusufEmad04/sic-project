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
  isValidDecimalNumber,
  isValidHexNumber
} from './lexer';

/**
 * Helper to create a detailed error with context from the line
 */
function createError(
  line: TokenizedLine,
  message: string,
  locctr: number | null,
  details?: string
): AssemblerError {
  return {
    lineNumber: line.lineNumber,
    message,
    type: 'error',
    phase: 'pass1',
    sourceLine: line.rawLine,
    label: line.label,
    opcode: line.opcode,
    operand: line.operand,
    locctr: locctr !== null ? locctr.toString(16).toUpperCase().padStart(4, '0') : undefined,
    details
  };
}

/**
 * Helper to create a warning with context
 */
function createWarning(
  line: TokenizedLine,
  message: string,
  locctr: number | null,
  details?: string
): AssemblerError {
  return {
    lineNumber: line.lineNumber,
    message,
    type: 'warning',
    phase: 'pass1',
    sourceLine: line.rawLine,
    label: line.label,
    opcode: line.opcode,
    operand: line.operand,
    locctr: locctr !== null ? locctr.toString(16).toUpperCase().padStart(4, '0') : undefined,
    details
  };
}

/**
 * Evaluate an expression that may contain symbols, numbers, and operators
 * Supports: +, -, *, and parentheses
 * Special value: * means current LOCCTR
 * 
 * @param expression The expression to evaluate
 * @param symbolTable Current symbol table
 * @param currentLocctr Current location counter (for * symbol)
 * @returns The evaluated value or null if expression cannot be evaluated
 */
function evaluateExpression(
  expression: string,
  symbolTable: SymbolTable,
  currentLocctr: number
): number | null {
  if (!expression || expression.trim().length === 0) {
    return null;
  }

  const expr = expression.trim();

  // Special case: just * means current LOCCTR
  if (expr === '*') {
    return currentLocctr;
  }

  // Try as a simple numeric value first
  const numValue = parseNumericOperand(expr);
  if (numValue !== null) {
    return numValue;
  }

  // Try as a simple symbol lookup
  const upperExpr = expr.toUpperCase();
  if (upperExpr in symbolTable) {
    return symbolTable[upperExpr];
  }

  // Handle expressions with + and -
  // Split by + and - while keeping the operators
  const tokens: string[] = [];
  const operators: string[] = [];
  let current = '';

  for (let i = 0; i < expr.length; i++) {
    const char = expr[i];

    if (char === '+' || char === '-') {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      operators.push(char);
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  // If we only have one token and no operators, we couldn't resolve it
  if (tokens.length === 1 && operators.length === 0) {
    return null;
  }

  // Evaluate each token
  const values: number[] = [];

  for (const token of tokens) {
    const upperToken = token.toUpperCase();

    if (upperToken === '*') {
      values.push(currentLocctr);
    } else if (upperToken in symbolTable) {
      values.push(symbolTable[upperToken]);
    } else {
      const numVal = parseNumericOperand(token);
      if (numVal !== null) {
        values.push(numVal);
      } else {
        // Undefined symbol
        return null;
      }
    }
  }

  // Apply operators
  if (values.length === 0) {
    return null;
  }

  let result = values[0];

  for (let i = 0; i < operators.length && i + 1 < values.length; i++) {
    if (operators[i] === '+') {
      result += values[i + 1];
    } else if (operators[i] === '-') {
      result -= values[i + 1];
    }
  }

  return result;
}

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
 * 5. Resolve deferred EQU directives (forward references)
 */
export function executePass1(lines: TokenizedLine[]): Pass1Result {
  const symbolTable: SymbolTable = {};
  const intermediateFile: IntermediateEntry[] = [];
  const errors: AssemblerError[] = [];

  // Track deferred EQU directives for forward reference resolution
  interface DeferredEQU {
    line: TokenizedLine;
    label: string;
    operand: string;
    locctr: number;
    intermediateIndex: number;
  }
  const deferredEQUs: DeferredEQU[] = [];

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
        errors.push(createError(
          line,
          'Duplicate START directive',
          locctr,
          'Only one START directive is allowed per program. Remove the duplicate or check for copy-paste errors.'
        ));
      }

      foundStart = true;
      startAddress = parseNumericOperand(line.operand || '0') || 0;
      locctr = startAddress;
      programName = line.label || 'PROG';

      // Add the program name label to symbol table
      // This allows jumps to the start of the program (e.g., J COPY)
      if (line.label) {
        const label = line.label.toUpperCase();
        symbolTable[label] = locctr;
      }

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

    // Handle EQU directive specially - value comes from operand, not LOCCTR
    if (opcode === 'EQU') {
      if (!line.label) {
        errors.push(createError(
          line,
          'EQU directive requires a label',
          currentLocctr,
          'EQU assigns a value to a symbol name. Add a label in the first column, e.g., "MAXLEN EQU 4096"'
        ));
      } else {
        const label = line.label.toUpperCase();
        const operand = line.operand;

        if (!operand) {
          errors.push(createError(
            line,
            'EQU directive requires an operand (value or expression)',
            currentLocctr,
            'Provide a numeric value, symbol, or expression. Examples: "EQU 100", "EQU *", "EQU BUFEND-BUFFER"'
          ));
        } else {
          // Handle special case: * means current LOCCTR
          let value: number | null = null;

          if (operand === '*') {
            value = locctr;
          } else {
            // Try to evaluate as expression
            value = evaluateExpression(operand, symbolTable, locctr);
          }

          if (value !== null) {
            if (label in symbolTable) {
              errors.push(createError(
                line,
                `Duplicate symbol: "${label}"`,
                currentLocctr,
                `Symbol "${label}" was already defined at address 0x${symbolTable[label].toString(16).toUpperCase()}. Use a different name or remove the duplicate.`
              ));
            } else {
              symbolTable[label] = value;
            }
          } else {
            // Defer this EQU for later resolution (forward reference)
            // Store the intermediate file index so we can update it later
            const intermediateIndex = intermediateFile.length;
            deferredEQUs.push({
              line,
              label,
              operand,
              locctr: currentLocctr,
              intermediateIndex
            });
          }
        }
      }

      intermediateFile.push({
        line: { ...line, location: currentLocctr },
        locctr: currentLocctr,
        size: 0,
        symbolTableSnapshot: { ...symbolTable }
      });
      continue;
    }

    // Handle ORG directive - changes LOCCTR
    if (opcode === 'ORG') {
      const operand = line.operand;

      if (!operand) {
        errors.push(createError(
          line,
          'ORG directive requires an address operand',
          locctr,
          'ORG sets the location counter to a new value. Examples: "ORG 2000", "ORG BUFFER", "ORG *+100"'
        ));
      } else {
        const value = evaluateExpression(operand, symbolTable, locctr);

        if (value !== null) {
          locctr = value;
        } else {
          errors.push(createError(
            line,
            `Cannot evaluate ORG expression: "${operand}"`,
            locctr,
            'The expression contains an undefined symbol or invalid syntax. Ensure all symbols are defined before this ORG directive.'
          ));
        }
      }

      intermediateFile.push({
        line: { ...line, location: locctr },
        locctr: locctr,
        size: 0,
        symbolTableSnapshot: { ...symbolTable }
      });
      continue;
    }

    // Process label - add to symbol table (for non-EQU directives)
    if (line.label) {
      const label = line.label.toUpperCase();

      if (label in symbolTable) {
        errors.push(createError(
          line,
          `Duplicate symbol: "${label}"`,
          locctr,
          `This label was already defined at address 0x${symbolTable[label].toString(16).toUpperCase()}. Each label can only be defined once.`
        ));
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

  // ============================================================================
  // Resolve deferred EQU directives (forward references)
  // ============================================================================
  // Now that all labels are defined, try to resolve EQU directives that
  // referenced symbols that weren't yet defined at the time of the EQU.
  // We iterate multiple times to handle chains like: A EQU B, B EQU C, C RESW 1
  
  let resolvedCount = 1; // Start with 1 to enter the loop
  let maxIterations = deferredEQUs.length + 1; // Prevent infinite loops
  let iterations = 0;

  while (resolvedCount > 0 && iterations < maxIterations) {
    resolvedCount = 0;
    iterations++;

    for (let i = deferredEQUs.length - 1; i >= 0; i--) {
      const deferred = deferredEQUs[i];
      
      // Try to evaluate the expression now that more symbols may be defined
      const value = evaluateExpression(deferred.operand, symbolTable, deferred.locctr);

      if (value !== null) {
        // Successfully resolved!
        if (deferred.label in symbolTable) {
          // Already defined (shouldn't happen normally)
          errors.push(createError(
            deferred.line,
            `Duplicate symbol: "${deferred.label}"`,
            deferred.locctr,
            `Symbol "${deferred.label}" was already defined. Use a different name.`
          ));
        } else {
          symbolTable[deferred.label] = value;
          
          // Update the intermediate file entry with the new symbol table
          if (deferred.intermediateIndex < intermediateFile.length) {
            intermediateFile[deferred.intermediateIndex].symbolTableSnapshot = { ...symbolTable };
          }
        }

        // Remove from deferred list
        deferredEQUs.splice(i, 1);
        resolvedCount++;
      }
    }
  }

  // Report errors for any EQU directives that still couldn't be resolved
  for (const deferred of deferredEQUs) {
    errors.push(createError(
      deferred.line,
      `Cannot evaluate EQU expression: "${deferred.operand}"`,
      deferred.locctr,
      `The expression contains an undefined symbol or circular reference. Check that all referenced symbols are defined somewhere in the program. Valid operators: +, -`
    ));
  }

  // Validate we found START and END
  if (!foundEnd) {
    const lastLine = lines[lines.length - 1];
    errors.push({
      lineNumber: lines.length,
      message: 'Missing END directive',
      type: 'warning',
      phase: 'pass1',
      sourceLine: lastLine?.rawLine,
      details: 'Every SIC/XE program should end with an END directive. Add "END [first_instruction]" at the end of your program.'
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
    case 'EQU':
    case 'ORG':
    case 'USE':
    case 'CSECT':
    case 'EXTDEF':
    case 'EXTREF':
      return 0;

    case 'BYTE':
      if (!operand) {
        errors.push({
          lineNumber,
          message: 'BYTE directive requires an operand (e.g., C\'EOF\' or X\'05\')',
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      const byteSize = calculateByteConstantSize(operand);
      if (byteSize === 0) {
        errors.push({
          lineNumber,
          message: `Invalid BYTE constant: "${operand}". Use C'chars' for characters or X'hexdigits' for hex (even number of digits).`,
          type: 'error',
          phase: 'pass1'
        });
      }
      return byteSize;

    case 'WORD':
      return 3; // Words are always 3 bytes in SIC/XE

    case 'RESB':
      if (!operand) {
        errors.push({
          lineNumber,
          message: 'RESB requires a positive integer operand (number of bytes to reserve)',
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      if (!isValidDecimalNumber(operand)) {
        errors.push({
          lineNumber,
          message: `RESB requires a positive integer, got: "${operand}"`,
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      const resbCount = parseInt(operand, 10);
      if (resbCount <= 0) {
        errors.push({
          lineNumber,
          message: `RESB count must be positive, got: ${resbCount}`,
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      return resbCount;

    case 'RESW':
      if (!operand) {
        errors.push({
          lineNumber,
          message: 'RESW requires a positive integer operand (number of words to reserve)',
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      if (!isValidDecimalNumber(operand)) {
        errors.push({
          lineNumber,
          message: `RESW requires a positive integer, got: "${operand}"`,
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      const reswCount = parseInt(operand, 10);
      if (reswCount <= 0) {
        errors.push({
          lineNumber,
          message: `RESW count must be positive, got: ${reswCount}`,
          type: 'error',
          phase: 'pass1'
        });
        return 0;
      }
      return reswCount * 3; // Each word is 3 bytes

    default:
      // Unknown directive - should not happen if isDirective() works correctly
      errors.push({
        lineNumber,
        message: `Unhandled directive in size calculation: "${directive}"`,
        type: 'warning',
        phase: 'pass1'
      });
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
