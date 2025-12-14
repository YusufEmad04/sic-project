/**
 * SIC/XE Operation Table (OPTAB)
 * Contains all instruction mnemonics with their opcodes and formats
 * 
 * Complete instruction set from Beck's "System Software" textbook
 * Includes all SIC (basic) and SIC/XE (extended) instructions
 * 
 * Instruction Formats:
 *   Format 1: 1 byte  - No operands (e.g., FIX, FLOAT)
 *   Format 2: 2 bytes - Register operations (e.g., ADDR, COMPR)
 *   Format 3: 3 bytes - Memory reference with addressing modes
 *   Format 4: 4 bytes - Extended format (20-bit address), uses + prefix
 * 
 * Addressing Modes (Format 3/4):
 *   Simple:    operand        (n=1, i=1)
 *   Immediate: #operand       (n=0, i=1)
 *   Indirect:  @operand       (n=1, i=0)
 *   Indexed:   operand,X      (x=1)
 *   PC-Relative: default for format 3
 *   Base-Relative: when PC-relative not possible
 *   Direct: for format 4 (extended)
 */

import { OpcodeEntry, OperationTable, RegisterTable, RegisterCode } from './types';

/**
 * Complete Operation Table for SIC/XE
 * Format: mnemonic -> { opcode (hex), format (1/2/3), operands count }
 * 
 * Legend:
 *   A = Accumulator register
 *   B = Base register
 *   S = General working register
 *   T = General working register
 *   F = Floating-point accumulator (48 bits)
 *   X = Index register
 *   L = Linkage register (return address)
 *   PC = Program counter
 *   SW = Status word (condition code)
 *   M = Memory location
 *   CC = Condition code
 */
export const OPTAB: OperationTable = {
  // ============================================
  // FORMAT 3/4 INSTRUCTIONS (Memory Reference)
  // Can be used with + prefix for Format 4
  // ============================================

  // --- Arithmetic Operations ---
  'ADD': { mnemonic: 'ADD', opcode: 0x18, format: 3, operands: 1 },     // A = A + M (word)
  'ADDF': { mnemonic: 'ADDF', opcode: 0x58, format: 3, operands: 1 },   // F = F + M (floating)
  'SUB': { mnemonic: 'SUB', opcode: 0x1C, format: 3, operands: 1 },     // A = A - M (word)
  'SUBF': { mnemonic: 'SUBF', opcode: 0x5C, format: 3, operands: 1 },   // F = F - M (floating)
  'MUL': { mnemonic: 'MUL', opcode: 0x20, format: 3, operands: 1 },     // A = A * M (word)
  'MULF': { mnemonic: 'MULF', opcode: 0x60, format: 3, operands: 1 },   // F = F * M (floating)
  'DIV': { mnemonic: 'DIV', opcode: 0x24, format: 3, operands: 1 },     // A = A / M (word)
  'DIVF': { mnemonic: 'DIVF', opcode: 0x64, format: 3, operands: 1 },   // F = F / M (floating)

  // --- Logical Operations ---
  'AND': { mnemonic: 'AND', opcode: 0x40, format: 3, operands: 1 },     // A = A AND M (bitwise)
  'OR': { mnemonic: 'OR', opcode: 0x44, format: 3, operands: 1 },       // A = A OR M (bitwise)

  // --- Comparison Operations ---
  'COMP': { mnemonic: 'COMP', opcode: 0x28, format: 3, operands: 1 },   // Compare A with M, set CC
  'COMPF': { mnemonic: 'COMPF', opcode: 0x88, format: 3, operands: 1 }, // Compare F with M (floating), set CC

  // --- Jump/Branch Instructions ---
  'J': { mnemonic: 'J', opcode: 0x3C, format: 3, operands: 1 },         // PC = M (unconditional jump)
  'JEQ': { mnemonic: 'JEQ', opcode: 0x30, format: 3, operands: 1 },     // PC = M if CC = "equal"
  'JGT': { mnemonic: 'JGT', opcode: 0x34, format: 3, operands: 1 },     // PC = M if CC = "greater than"
  'JLT': { mnemonic: 'JLT', opcode: 0x38, format: 3, operands: 1 },     // PC = M if CC = "less than"
  'JSUB': { mnemonic: 'JSUB', opcode: 0x48, format: 3, operands: 1 },   // L = PC, PC = M (jump to subroutine)
  'RSUB': { mnemonic: 'RSUB', opcode: 0x4C, format: 3, operands: 0 },   // PC = L (return from subroutine)

  // --- Load Instructions ---
  'LDA': { mnemonic: 'LDA', opcode: 0x00, format: 3, operands: 1 },     // A = M (load accumulator)
  'LDB': { mnemonic: 'LDB', opcode: 0x68, format: 3, operands: 1 },     // B = M (load base register) [XE]
  'LDCH': { mnemonic: 'LDCH', opcode: 0x50, format: 3, operands: 1 },   // A[rightmost byte] = M[rightmost byte]
  'LDF': { mnemonic: 'LDF', opcode: 0x70, format: 3, operands: 1 },     // F = M (load floating accumulator) [XE]
  'LDL': { mnemonic: 'LDL', opcode: 0x08, format: 3, operands: 1 },     // L = M (load linkage register)
  'LDS': { mnemonic: 'LDS', opcode: 0x6C, format: 3, operands: 1 },     // S = M (load S register) [XE]
  'LDT': { mnemonic: 'LDT', opcode: 0x74, format: 3, operands: 1 },     // T = M (load T register) [XE]
  'LDX': { mnemonic: 'LDX', opcode: 0x04, format: 3, operands: 1 },     // X = M (load index register)

  // --- Store Instructions ---
  'STA': { mnemonic: 'STA', opcode: 0x0C, format: 3, operands: 1 },     // M = A (store accumulator)
  'STB': { mnemonic: 'STB', opcode: 0x78, format: 3, operands: 1 },     // M = B (store base register) [XE]
  'STCH': { mnemonic: 'STCH', opcode: 0x54, format: 3, operands: 1 },   // M[rightmost byte] = A[rightmost byte]
  'STF': { mnemonic: 'STF', opcode: 0x80, format: 3, operands: 1 },     // M = F (store floating accumulator) [XE]
  'STI': { mnemonic: 'STI', opcode: 0xD4, format: 3, operands: 1 },     // M = I (store interval timer) [XE, Privileged]
  'STL': { mnemonic: 'STL', opcode: 0x14, format: 3, operands: 1 },     // M = L (store linkage register)
  'STS': { mnemonic: 'STS', opcode: 0x7C, format: 3, operands: 1 },     // M = S (store S register) [XE]
  'STSW': { mnemonic: 'STSW', opcode: 0xE8, format: 3, operands: 1 },   // M = SW (store status word) [Privileged]
  'STT': { mnemonic: 'STT', opcode: 0x84, format: 3, operands: 1 },     // M = T (store T register) [XE]
  'STX': { mnemonic: 'STX', opcode: 0x10, format: 3, operands: 1 },     // M = X (store index register)

  // --- Index Register Operations ---
  'TIX': { mnemonic: 'TIX', opcode: 0x2C, format: 3, operands: 1 },     // X = X + 1, compare X with M, set CC

  // --- I/O Operations ---
  'RD': { mnemonic: 'RD', opcode: 0xD8, format: 3, operands: 1 },       // A[rightmost byte] = data from device M
  'TD': { mnemonic: 'TD', opcode: 0xE0, format: 3, operands: 1 },       // Test device M, set CC
  'WD': { mnemonic: 'WD', opcode: 0xDC, format: 3, operands: 1 },       // Write A[rightmost byte] to device M

  // --- System Instructions (Privileged) ---
  'LPS': { mnemonic: 'LPS', opcode: 0xD0, format: 3, operands: 1 },     // Load processor status from M [Privileged]
  'SSK': { mnemonic: 'SSK', opcode: 0xEC, format: 3, operands: 1 },     // Set storage key for M [Privileged]

  // ============================================
  // FORMAT 2 INSTRUCTIONS (Register-to-Register)
  // 2 bytes: opcode (1 byte) + r1,r2 (1 byte)
  // SIC/XE only
  // ============================================

  // --- Register Arithmetic ---
  'ADDR': { mnemonic: 'ADDR', opcode: 0x90, format: 2, operands: 2 },   // r2 = r2 + r1
  'SUBR': { mnemonic: 'SUBR', opcode: 0x94, format: 2, operands: 2 },   // r2 = r2 - r1
  'MULR': { mnemonic: 'MULR', opcode: 0x98, format: 2, operands: 2 },   // r2 = r2 * r1
  'DIVR': { mnemonic: 'DIVR', opcode: 0x9C, format: 2, operands: 2 },   // r2 = r2 / r1

  // --- Register Comparison ---
  'COMPR': { mnemonic: 'COMPR', opcode: 0xA0, format: 2, operands: 2 }, // Compare r1 with r2, set CC

  // --- Register Shift ---
  'SHIFTL': { mnemonic: 'SHIFTL', opcode: 0xA4, format: 2, operands: 2 }, // Shift r1 left n bits (n = r2 + 1)
  'SHIFTR': { mnemonic: 'SHIFTR', opcode: 0xA8, format: 2, operands: 2 }, // Shift r1 right n bits (n = r2 + 1)

  // --- Register Move/Clear ---
  'RMO': { mnemonic: 'RMO', opcode: 0xAC, format: 2, operands: 2 },     // r2 = r1 (register move)
  'CLEAR': { mnemonic: 'CLEAR', opcode: 0xB4, format: 2, operands: 1 }, // r1 = 0 (clear register)

  // --- Index Register ---
  'TIXR': { mnemonic: 'TIXR', opcode: 0xB8, format: 2, operands: 1 },   // X = X + 1, compare X with r1, set CC

  // --- System Call ---
  'SVC': { mnemonic: 'SVC', opcode: 0xB0, format: 2, operands: 1 },     // Supervisor call, generate SVC interrupt

  // ============================================
  // FORMAT 1 INSTRUCTIONS (No Operands)
  // 1 byte: opcode only
  // SIC/XE only
  // ============================================

  // --- Floating Point Conversion ---
  'FIX': { mnemonic: 'FIX', opcode: 0xC4, format: 1, operands: 0 },     // A = F converted to integer
  'FLOAT': { mnemonic: 'FLOAT', opcode: 0xC0, format: 1, operands: 0 }, // F = A converted to floating
  'NORM': { mnemonic: 'NORM', opcode: 0xC8, format: 1, operands: 0 },   // Normalize F (floating point)

  // --- I/O Channel Operations (Privileged) ---
  'HIO': { mnemonic: 'HIO', opcode: 0xF4, format: 1, operands: 0 },     // Halt I/O channel [Privileged]
  'SIO': { mnemonic: 'SIO', opcode: 0xF0, format: 1, operands: 0 },     // Start I/O channel [Privileged]
  'TIO': { mnemonic: 'TIO', opcode: 0xF8, format: 1, operands: 0 },     // Test I/O channel, set CC [Privileged]
};

/**
 * SIC/XE Register Table
 * Maps register names to their numeric codes (used in Format 2 instructions)
 * 
 * Registers:
 *   A (0)  - Accumulator (24 bits) - Primary arithmetic register
 *   X (1)  - Index register (24 bits) - Used for indexed addressing
 *   L (2)  - Linkage register (24 bits) - Holds return address for JSUB/RSUB
 *   B (3)  - Base register (24 bits) - Used for base-relative addressing [XE only]
 *   S (4)  - General working register (24 bits) [XE only]
 *   T (5)  - General working register (24 bits) [XE only]
 *   F (6)  - Floating-point accumulator (48 bits) [XE only]
 *   PC (8) - Program counter (24 bits) - Address of next instruction
 *   SW (9) - Status word (24 bits) - Contains condition code and other flags
 */
export const REGISTERS: RegisterTable = {
  'A': 0,   // Accumulator
  'X': 1,   // Index register
  'L': 2,   // Linkage register
  'B': 3,   // Base register [XE]
  'S': 4,   // General register [XE]
  'T': 5,   // General register [XE]
  'F': 6,   // Floating-point accumulator [XE]
  'PC': 8,  // Program counter
  'SW': 9,  // Status word
};

/**
 * Assembler Directives (not in OPTAB)
 * These are pseudo-instructions that guide the assembler but don't generate machine code
 * 
 * Directives:
 *   START  - Specify program name and starting address
 *   END    - Mark end of source, optionally specify first executable instruction
 *   BYTE   - Generate character or hexadecimal constant (1-n bytes)
 *   WORD   - Generate one-word (3 bytes) integer constant
 *   RESB   - Reserve bytes of storage
 *   RESW   - Reserve words of storage (1 word = 3 bytes)
 *   BASE   - Inform assembler that base register contains specified address
 *   NOBASE - Inform assembler that base register is no longer available
 *   EQU    - Define symbol with specified value
 *   ORG    - Set location counter to specified value
 *   LTORG  - Generate literal pool at current location
 *   USE    - Switch to specified program block [XE only]
 *   CSECT  - Identify control section [XE only]
 *   EXTDEF - Identify external symbols defined in this control section [XE only]
 *   EXTREF - Identify external symbols referred to in this control section [XE only]
 */
export const DIRECTIVES = new Set([
  'START',
  'END',
  'BYTE',
  'WORD',
  'RESB',
  'RESW',
  'BASE',
  'NOBASE',
  'EQU',
  'ORG',
  'LTORG',
  'USE',
  'CSECT',
  'EXTDEF',
  'EXTREF',
]);

/**
 * Check if a mnemonic is a valid opcode
 */
export function isValidOpcode(mnemonic: string): boolean {
  const normalized = mnemonic.toUpperCase().replace(/^\+/, '');
  return normalized in OPTAB;
}

/**
 * Check if a mnemonic is a directive
 */
export function isDirective(mnemonic: string): boolean {
  return DIRECTIVES.has(mnemonic.toUpperCase());
}

/**
 * Get opcode entry from OPTAB
 */
export function getOpcodeEntry(mnemonic: string): OpcodeEntry | null {
  const normalized = mnemonic.toUpperCase().replace(/^\+/, '');
  return OPTAB[normalized] || null;
}

/**
 * Get register code
 */
export function getRegisterCode(register: string): RegisterCode | null {
  const normalized = register.toUpperCase();
  if (normalized in REGISTERS) {
    return REGISTERS[normalized] as RegisterCode;
  }
  return null;
}

/**
 * Check if instruction is Format 2 (register instruction)
 */
export function isFormat2Instruction(mnemonic: string): boolean {
  const entry = getOpcodeEntry(mnemonic);
  return entry?.format === 2;
}

/**
 * Check if instruction can be Format 4 (extended)
 */
export function canBeExtended(mnemonic: string): boolean {
  const entry = getOpcodeEntry(mnemonic);
  return entry?.format === 3;
}

/**
 * Get instruction format (considering + prefix)
 */
export function getInstructionFormat(mnemonic: string): 1 | 2 | 3 | 4 | 0 {
  const isExtended = mnemonic.startsWith('+');
  const cleanMnemonic = mnemonic.replace(/^\+/, '').toUpperCase();

  if (isDirective(cleanMnemonic)) {
    return 0;
  }

  const entry = OPTAB[cleanMnemonic];
  if (!entry) {
    return 0;
  }

  if (isExtended && entry.format === 3) {
    return 4;
  }

  return entry.format;
}

/**
 * Get the size of an instruction in bytes
 */
export function getInstructionSize(mnemonic: string): number {
  return getInstructionFormat(mnemonic);
}
