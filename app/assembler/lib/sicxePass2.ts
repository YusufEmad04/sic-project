/**
 * SIC/XE Pass 2 Algorithm
 * Generates object code using symbol table from Pass 1
 */

import {
  Pass1Result,
  Pass2Result,
  Pass2Entry,
  SymbolTable,
  IntermediateEntry,
  NixbpeFlags,
  AddressingMode,
  DisplacementMode,
  AssemblerError,
  ObjectCodeBreakdown
} from './types';
import {
  getOpcodeEntry,
  getRegisterCode,
  isDirective
} from './optab';
import {
  extractByteConstant,
  parseNumericOperand,
  isValidDecimalNumber
} from './lexer';

/**
 * Helper to create a detailed error for Pass 2
 */
function createPass2Error(
  entry: IntermediateEntry,
  message: string,
  details?: string
): AssemblerError {
  return {
    lineNumber: entry.line.lineNumber,
    message,
    type: 'error',
    phase: 'pass2',
    sourceLine: (entry.line as { rawLine?: string }).rawLine,
    label: entry.line.label,
    opcode: entry.line.opcode,
    operand: entry.line.operand,
    locctr: entry.locctr !== null ? entry.locctr.toString(16).toUpperCase().padStart(4, '0') : undefined,
    details
  };
}

/**
 * Execute Pass 2 of the assembler
 *
 * Tasks:
 * 1. For each instruction:
 *    - Determine format (1, 2, 3, 4)
 *    - Determine addressing mode (immediate, indirect, simple)
 *    - Compute target address from SYMTAB or immediate value
 *    - Calculate displacement (PC-relative or BASE-relative)
 *    - Set nixbpe flags
 *    - Generate object code
 */
export function executePass2(pass1Result: Pass1Result): Pass2Result {
  const { intermediateFile, symbolTable } = pass1Result;
  const entries: Pass2Entry[] = [];
  const errors: AssemblerError[] = [];

  let baseRegister: number | null = null;

  for (const entry of intermediateFile) {
    const line = entry.line;

    // Skip empty lines and comments
    if (line.isEmpty || line.isComment) {
      entries.push({
        line,
        format: 0,
        nixbpe: null,
        targetAddress: null,
        displacement: null,
        displacementMode: 'none',
        addressingMode: null,
        objectCode: null,
        needsModification: false
      });
      continue;
    }

    const opcode = line.opcode.toUpperCase();

    // Handle directives
    if (isDirective(opcode)) {
      const result = handleDirective(opcode, line, entry, symbolTable, baseRegister);

      if (result.baseUpdate !== undefined) {
        baseRegister = result.baseUpdate;
      }

      if (result.error) {
        errors.push(createPass2Error(
          entry,
          result.error,
          'This error occurred while processing a directive. Check the operand syntax and ensure all referenced symbols are defined.'
        ));
      }

      entries.push(result.entry);
      continue;
    }

    // Handle instructions
    const result = generateInstructionCode(
      line,
      entry,
      symbolTable,
      baseRegister
    );

    if (result.error) {
      errors.push(createPass2Error(
        entry,
        result.error,
        result.errorDetails || 'This error occurred during object code generation. Check the instruction format and operand addressing.'
      ));
    }

    entries.push(result.entry);
  }

  return {
    entries,
    errors,
    success: !errors.some(e => e.type === 'error'),
    baseRegister
  };
}

/**
 * Handle directive object code generation
 */
function handleDirective(
  directive: string,
  line: { opcode: string; operand?: string; lineNumber: number; location?: number },
  entry: IntermediateEntry,
  symbolTable: SymbolTable,
  _currentBase: number | null // eslint-disable-line @typescript-eslint/no-unused-vars
): { entry: Pass2Entry; baseUpdate?: number | null; error?: string } {
  const baseEntry: Pass2Entry = {
    line: line as Pass2Entry['line'],
    format: 0,
    nixbpe: null,
    targetAddress: null,
    displacement: null,
    displacementMode: 'none',
    addressingMode: null,
    objectCode: null,
    needsModification: false
  };

  switch (directive) {
    case 'START':
    case 'END':
    case 'LTORG':
    case 'EQU':
    case 'ORG':
      return { entry: baseEntry };

    case 'BASE':
      // Set BASE register
      if (line.operand) {
        const operand = line.operand.toUpperCase();
        let baseValue: number | null = null;

        if (operand in symbolTable) {
          baseValue = symbolTable[operand];
        } else {
          baseValue = parseNumericOperand(operand);
        }

        if (baseValue !== null) {
          return { entry: baseEntry, baseUpdate: baseValue };
        } else {
          return {
            entry: baseEntry,
            error: `Undefined symbol for BASE: "${line.operand}"`
          };
        }
      }
      return { entry: baseEntry };

    case 'NOBASE':
      return { entry: baseEntry, baseUpdate: null };

    case 'BYTE':
      const byteCode = generateByteCode(line.operand);
      return {
        entry: {
          ...baseEntry,
          objectCode: byteCode
        }
      };

    case 'WORD':
      const wordCode = generateWordCode(line.operand, symbolTable);
      return {
        entry: {
          ...baseEntry,
          objectCode: wordCode.code,
          needsModification: wordCode.needsModification
        },
        error: wordCode.error
      };

    case 'RESB':
    case 'RESW':
      // No object code for reserved space
      return { entry: baseEntry };

    default:
      return { entry: baseEntry };
  }
}

/**
 * Generate object code for BYTE directive
 */
function generateByteCode(operand: string | undefined): string | null {
  if (!operand) return null;

  const extracted = extractByteConstant(operand);
  if (!extracted) return null;

  if (extracted.type === 'char') {
    // Convert characters to hex
    let hex = '';
    for (const char of extracted.value) {
      hex += char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0');
    }
    return hex;
  } else {
    // Already hex
    return extracted.value.toUpperCase();
  }
}

/**
 * Generate object code for WORD directive
 * WORD can contain numbers, symbols, or expressions
 */
function generateWordCode(
  operand: string | undefined,
  symbolTable: SymbolTable
): { code: string | null; needsModification: boolean; error?: string } {
  if (!operand) {
    return { code: null, needsModification: false, error: 'WORD requires an operand' };
  }

  // Try to evaluate as an expression (handles symbols, numbers, and expressions like SYMBOL+5)
  const exprValue = evaluateOperandExpression(operand, symbolTable);

  if (exprValue !== null) {
    // Handle negative numbers with two's complement
    let value = exprValue;
    if (value < 0) {
      value = (1 << 24) + value; // 24-bit two's complement
    }

    // Check if it's a simple symbol reference (needs modification for relocation)
    const upperOperand = operand.toUpperCase();
    const isSimpleSymbol = upperOperand in symbolTable &&
      !operand.includes('+') && !operand.includes('-');

    return {
      code: (value & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0'),
      needsModification: isSimpleSymbol
    };
  }

  return {
    code: null,
    needsModification: false,
    error: `Cannot evaluate WORD operand: "${operand}" - undefined symbol or invalid expression`
  };
}

/**
 * Generate object code for an instruction
 */
function generateInstructionCode(
  line: {
    opcode: string;
    operand?: string;
    lineNumber: number;
    location?: number;
    isExtended?: boolean;
    addressingPrefix?: '#' | '@';
    indexed?: boolean;
  },
  entry: IntermediateEntry,
  symbolTable: SymbolTable,
  baseRegister: number | null
): { entry: Pass2Entry; error?: string; errorDetails?: string } {
  const isExtended = line.isExtended || line.opcode.startsWith('+');
  const cleanOpcode = line.opcode.toUpperCase().replace(/^\+/, '');
  const opcodeEntry = getOpcodeEntry(cleanOpcode);

  if (!opcodeEntry) {
    return {
      entry: createErrorEntry(line),
      error: `Unknown opcode: "${cleanOpcode}"`,
      errorDetails: `The instruction "${cleanOpcode}" is not recognized. Check spelling or ensure it's a valid SIC/XE instruction.`
    };
  }

  const format = isExtended ? 4 : opcodeEntry.format;

  switch (format) {
    case 1:
      return generateFormat1(line, opcodeEntry);
    case 2:
      return generateFormat2(line, opcodeEntry);
    case 3:
      return generateFormat3(line, opcodeEntry, entry, symbolTable, baseRegister);
    case 4:
      return generateFormat4(line, opcodeEntry, entry, symbolTable);
    default:
      return {
        entry: createErrorEntry(line),
        error: `Invalid format: ${format}`,
        errorDetails: 'Internal error: instruction format must be 1, 2, 3, or 4.'
      };
  }
}

/**
 * Create an error entry
 */
function createErrorEntry(line: Pass2Entry['line']): Pass2Entry {
  return {
    line,
    format: 0,
    nixbpe: null,
    targetAddress: null,
    displacement: null,
    displacementMode: 'none',
    addressingMode: null,
    objectCode: null,
    needsModification: false
  };
}

/**
 * Generate Format 1 instruction (1 byte, opcode only)
 */
function generateFormat1(
  line: Pass2Entry['line'],
  opcodeEntry: { opcode: number }
): { entry: Pass2Entry; error?: string } {
  const objectCode = opcodeEntry.opcode.toString(16).toUpperCase().padStart(2, '0');

  return {
    entry: {
      line,
      format: 1,
      nixbpe: null,
      targetAddress: null,
      displacement: null,
      displacementMode: 'none',
      addressingMode: null,
      objectCode,
      needsModification: false,
      breakdown: {
        opcodeBits: opcodeEntry.opcode.toString(2).padStart(8, '0'),
        nixbpeBits: '',
        displacementBits: '',
        fullBinary: opcodeEntry.opcode.toString(2).padStart(8, '0'),
        fullHex: objectCode,
        explanation: `Format 1: opcode only (${objectCode})`
      }
    }
  };
}

/**
 * Generate Format 2 instruction (2 bytes, opcode + registers)
 */
function generateFormat2(
  line: Pass2Entry['line'],
  opcodeEntry: { opcode: number; operands: number }
): { entry: Pass2Entry; error?: string } {
  const operand = line.operand || '';
  const parts = operand.split(',').map(p => p.trim().toUpperCase());

  let r1 = 0;
  let r2 = 0;

  if (parts.length >= 1 && parts[0]) {
    // Check if it's a register or a number (for SVC, SHIFTL, SHIFTR)
    const reg1 = getRegisterCode(parts[0]);
    if (reg1 !== null) {
      r1 = reg1;
    } else if (isValidDecimalNumber(parts[0])) {
      r1 = parseInt(parts[0], 10);
    }
  }

  if (parts.length >= 2 && parts[1]) {
    const reg2 = getRegisterCode(parts[1]);
    if (reg2 !== null) {
      r2 = reg2;
    } else if (isValidDecimalNumber(parts[1])) {
      // For SHIFTL/SHIFTR, second operand is shift count - 1
      r2 = parseInt(parts[1], 10) - 1;
    }
  }

  const objectCode =
    opcodeEntry.opcode.toString(16).toUpperCase().padStart(2, '0') +
    r1.toString(16).toUpperCase() +
    r2.toString(16).toUpperCase();

  return {
    entry: {
      line,
      format: 2,
      nixbpe: null,
      targetAddress: null,
      displacement: null,
      displacementMode: 'none',
      addressingMode: null,
      objectCode,
      needsModification: false,
      breakdown: {
        opcodeBits: opcodeEntry.opcode.toString(2).padStart(8, '0'),
        nixbpeBits: '',
        displacementBits: `r1=${r1}, r2=${r2}`,
        fullBinary: '',
        fullHex: objectCode,
        explanation: `Format 2: opcode(${opcodeEntry.opcode.toString(16).toUpperCase()}) r1(${r1}) r2(${r2})`
      }
    }
  };
}

/**
 * Generate Format 3 instruction (3 bytes)
 */
function generateFormat3(
  line: Pass2Entry['line'],
  opcodeEntry: { opcode: number },
  entry: IntermediateEntry,
  symbolTable: SymbolTable,
  baseRegister: number | null
): { entry: Pass2Entry; error?: string } {
  // Determine addressing mode
  const { n, i, x, addressingMode, targetAddress, error: addrError } =
    resolveAddressing(line, symbolTable);

  if (addrError) {
    return {
      entry: createErrorEntry(line),
      error: addrError
    };
  }

  // Calculate displacement
  const currentLocation = entry.locctr ?? 0;
  const pc = currentLocation + 3; // PC points to next instruction

  let displacement: number;
  let b = 0;
  let p = 0;
  let displacementMode: DisplacementMode = 'none';

  // For immediate addressing with a constant value, use the value directly
  if (addressingMode === 'immediate' && targetAddress !== null && line.operand) {
    const immediateValue = parseNumericOperand(line.operand.replace(/^#/, ''));
    if (immediateValue !== null && !(line.operand.replace(/^#/, '').toUpperCase() in symbolTable)) {
      // Direct immediate value
      displacement = immediateValue & 0xFFF;
      displacementMode = 'direct';
    } else {
      // Symbol-based immediate - still need PC or BASE relative
      const dispResult = calculateDisplacement(targetAddress!, pc, baseRegister);
      displacement = dispResult.displacement;
      b = dispResult.b;
      p = dispResult.p;
      displacementMode = dispResult.mode;

      if (dispResult.error) {
        return {
          entry: createErrorEntry(line),
          error: dispResult.error
        };
      }
    }
  } else if (targetAddress !== null) {
    // Regular addressing - use PC or BASE relative
    const dispResult = calculateDisplacement(targetAddress, pc, baseRegister);
    displacement = dispResult.displacement;
    b = dispResult.b;
    p = dispResult.p;
    displacementMode = dispResult.mode;

    if (dispResult.error) {
      return {
        entry: createErrorEntry(line),
        error: dispResult.error
      };
    }
  } else {
    // No operand (like RSUB)
    displacement = 0;
    displacementMode = 'none';
  }

  const nixbpe: NixbpeFlags = {
    n: n as 0 | 1,
    i: i as 0 | 1,
    x: x as 0 | 1,
    b: b as 0 | 1,
    p: p as 0 | 1,
    e: 0
  };

  const objectCode = buildFormat3ObjectCode(opcodeEntry.opcode, nixbpe, displacement);

  return {
    entry: {
      line,
      format: 3,
      nixbpe,
      targetAddress,
      displacement,
      displacementMode,
      addressingMode,
      objectCode,
      needsModification: false,
      breakdown: buildBreakdown(opcodeEntry.opcode, nixbpe, displacement, 3)
    }
  };
}

/**
 * Generate Format 4 instruction (4 bytes, extended)
 */
function generateFormat4(
  line: Pass2Entry['line'],
  opcodeEntry: { opcode: number },
  entry: IntermediateEntry,
  symbolTable: SymbolTable
): { entry: Pass2Entry; error?: string } {
  // Determine addressing mode
  const { n, i, x, addressingMode, targetAddress, error: addrError } =
    resolveAddressing(line, symbolTable);

  if (addrError) {
    return {
      entry: createErrorEntry(line),
      error: addrError
    };
  }

  let address = targetAddress ?? 0;
  let needsModification = false;

  // For immediate addressing with a constant, use the value directly
  if (addressingMode === 'immediate' && line.operand) {
    const immediateValue = parseNumericOperand(line.operand.replace(/^#/, ''));
    if (immediateValue !== null && !(line.operand.replace(/^#/, '').toUpperCase() in symbolTable)) {
      address = immediateValue;
    } else {
      // Symbol reference in Format 4 needs modification record
      needsModification = true;
    }
  } else if (targetAddress !== null) {
    // Symbol reference - needs modification for relocation
    needsModification = n === 1 && i === 1; // Only simple addressing needs modification
  }

  const nixbpe: NixbpeFlags = {
    n: n as 0 | 1,
    i: i as 0 | 1,
    x: x as 0 | 1,
    b: 0,
    p: 0,
    e: 1 // Extended format
  };

  const objectCode = buildFormat4ObjectCode(opcodeEntry.opcode, nixbpe, address);

  return {
    entry: {
      line,
      format: 4,
      nixbpe,
      targetAddress,
      displacement: address,
      displacementMode: 'direct',
      addressingMode,
      objectCode,
      needsModification,
      breakdown: buildBreakdown(opcodeEntry.opcode, nixbpe, address, 4)
    }
  };
}

/**
 * Resolve addressing mode and target address
 */
function resolveAddressing(
  line: { operand?: string; addressingPrefix?: '#' | '@'; indexed?: boolean },
  symbolTable: SymbolTable
): {
  n: number;
  i: number;
  x: number;
  addressingMode: AddressingMode;
  targetAddress: number | null;
  error?: string;
} {
  let n = 1;
  let i = 1;
  let x = line.indexed ? 1 : 0;
  let addressingMode: AddressingMode = 'simple';
  let targetAddress: number | null = null;

  // Check addressing prefix
  if (line.addressingPrefix === '#') {
    n = 0;
    i = 1;
    addressingMode = 'immediate';
  } else if (line.addressingPrefix === '@') {
    n = 1;
    i = 0;
    addressingMode = 'indirect';
  }

  // Get operand value
  if (line.operand) {
    let cleanOperand = line.operand;

    // Remove addressing prefix if still present
    if (cleanOperand.startsWith('#') || cleanOperand.startsWith('@')) {
      cleanOperand = cleanOperand.substring(1);
    }

    // Remove indexed suffix if still present
    if (cleanOperand.toUpperCase().endsWith(',X')) {
      cleanOperand = cleanOperand.slice(0, -2);
      x = 1;
    }

    // Try to evaluate the operand - could be a symbol, number, or expression
    targetAddress = evaluateOperandExpression(cleanOperand, symbolTable);

    if (targetAddress === null && addressingMode !== 'immediate') {
      // Only error if not immediate (immediate can have forward references)
      return {
        n, i, x, addressingMode, targetAddress: null,
        error: `Cannot resolve operand: "${cleanOperand}" - undefined symbol or invalid expression`
      };
    }
  }

  return { n, i, x, addressingMode, targetAddress };
}

/**
 * Evaluate an operand expression that may contain symbols and arithmetic
 * Supports expressions like: SYMBOL, SYMBOL+5, SYMBOL-3, 100, etc.
 */
function evaluateOperandExpression(
  operand: string,
  symbolTable: SymbolTable
): number | null {
  if (!operand || operand.trim().length === 0) {
    return null;
  }

  const expr = operand.trim().toUpperCase();

  // Try as a simple symbol lookup first
  if (expr in symbolTable) {
    return symbolTable[expr];
  }

  // Try as a numeric value
  const numValue = parseNumericOperand(operand);
  if (numValue !== null) {
    return numValue;
  }

  // Handle expressions with + and -
  // Split by + and - while keeping track of operators
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
    if (token in symbolTable) {
      values.push(symbolTable[token]);
    } else {
      const numVal = parseNumericOperand(token);
      if (numVal !== null) {
        values.push(numVal);
      } else {
        // Undefined symbol in expression
        return null;
      }
    }
  }

  // Apply operators
  if (values.length === 0) {
    return null;
  }

  let result = values[0];

  for (let j = 0; j < operators.length && j + 1 < values.length; j++) {
    if (operators[j] === '+') {
      result += values[j + 1];
    } else if (operators[j] === '-') {
      result -= values[j + 1];
    }
  }

  return result;
}

/**
 * Calculate displacement for PC-relative or BASE-relative addressing
 */
function calculateDisplacement(
  targetAddress: number,
  pc: number,
  baseRegister: number | null
): {
  displacement: number;
  b: number;
  p: number;
  mode: DisplacementMode;
  error?: string;
} {
  // Try PC-relative first
  const pcDisp = targetAddress - pc;

  // PC-relative: displacement must fit in 12 bits signed (-2048 to 2047)
  if (pcDisp >= -2048 && pcDisp <= 2047) {
    // Handle negative displacement with two's complement
    const displacement = pcDisp < 0 ? (pcDisp + 4096) & 0xFFF : pcDisp;
    return {
      displacement,
      b: 0,
      p: 1,
      mode: 'PC-relative'
    };
  }

  // Try BASE-relative
  if (baseRegister !== null) {
    const baseDisp = targetAddress - baseRegister;

    // BASE-relative: displacement must fit in 12 bits unsigned (0 to 4095)
    if (baseDisp >= 0 && baseDisp <= 4095) {
      return {
        displacement: baseDisp,
        b: 1,
        p: 0,
        mode: 'BASE-relative'
      };
    }
  }

  return {
    displacement: 0,
    b: 0,
    p: 0,
    mode: 'none',
    error: `Target address ${targetAddress.toString(16).toUpperCase()} is out of range for PC-relative (PC=${pc.toString(16).toUpperCase()}) and BASE-relative${baseRegister !== null ? ` (BASE=${baseRegister.toString(16).toUpperCase()})` : ' (BASE not set)'}. Use extended format (+).`
  };
}

/**
 * Build Format 3 object code
 */
function buildFormat3ObjectCode(opcode: number, nixbpe: NixbpeFlags, displacement: number): string {
  // First byte: opcode (6 bits) + n + i
  const byte1 = (opcode & 0xFC) | (nixbpe.n << 1) | nixbpe.i;

  // Second byte: x + b + p + e + high 4 bits of displacement
  const byte2 = (nixbpe.x << 7) | (nixbpe.b << 6) | (nixbpe.p << 5) | (nixbpe.e << 4) | ((displacement >> 8) & 0x0F);

  // Third byte: low 8 bits of displacement
  const byte3 = displacement & 0xFF;

  return byte1.toString(16).toUpperCase().padStart(2, '0') +
    byte2.toString(16).toUpperCase().padStart(2, '0') +
    byte3.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Build Format 4 object code
 */
function buildFormat4ObjectCode(opcode: number, nixbpe: NixbpeFlags, address: number): string {
  // First byte: opcode (6 bits) + n + i
  const byte1 = (opcode & 0xFC) | (nixbpe.n << 1) | nixbpe.i;

  // Second byte: x + b + p + e + high 4 bits of address
  const byte2 = (nixbpe.x << 7) | (nixbpe.b << 6) | (nixbpe.p << 5) | (nixbpe.e << 4) | ((address >> 16) & 0x0F);

  // Third byte: middle 8 bits of address
  const byte3 = (address >> 8) & 0xFF;

  // Fourth byte: low 8 bits of address
  const byte4 = address & 0xFF;

  return byte1.toString(16).toUpperCase().padStart(2, '0') +
    byte2.toString(16).toUpperCase().padStart(2, '0') +
    byte3.toString(16).toUpperCase().padStart(2, '0') +
    byte4.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Build breakdown for visualization
 */
function buildBreakdown(
  opcode: number,
  nixbpe: NixbpeFlags,
  displacement: number,
  format: 3 | 4
): ObjectCodeBreakdown {
  const opcodeBits = (opcode >> 2).toString(2).padStart(6, '0');
  const nixbpeBits = `${nixbpe.n}${nixbpe.i}${nixbpe.x}${nixbpe.b}${nixbpe.p}${nixbpe.e}`;
  const dispBits = format === 3
    ? displacement.toString(2).padStart(12, '0')
    : displacement.toString(2).padStart(20, '0');

  const fullBinary = opcodeBits + nixbpeBits + dispBits;

  // Convert binary to hex
  const fullHex = parseInt(fullBinary, 2).toString(16).toUpperCase().padStart(format === 3 ? 6 : 8, '0');

  const explanation = `Format ${format}: opcode(${(opcode >> 2).toString(16).toUpperCase()}) ` +
    `n=${nixbpe.n} i=${nixbpe.i} x=${nixbpe.x} b=${nixbpe.b} p=${nixbpe.p} e=${nixbpe.e} ` +
    `disp/addr=${displacement.toString(16).toUpperCase()}`;

  return {
    opcodeBits,
    nixbpeBits,
    displacementBits: dispBits,
    fullBinary,
    fullHex,
    explanation
  };
}
