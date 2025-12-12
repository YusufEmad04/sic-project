/**
 * SIC/XE Operation Table (OPTAB)
 * Contains all instruction mnemonics with their opcodes and formats
 */

import { OpcodeEntry, OperationTable, RegisterTable, RegisterCode } from './types';

/**
 * Complete Operation Table for SIC/XE
 * Format: mnemonic -> { opcode (hex), format (1/2/3), operands count }
 */
export const OPTAB: OperationTable = {
  // Format 3/4 Instructions (Memory Reference)
  'ADD': { mnemonic: 'ADD', opcode: 0x18, format: 3, operands: 1 },
  'ADDF': { mnemonic: 'ADDF', opcode: 0x58, format: 3, operands: 1 },
  'AND': { mnemonic: 'AND', opcode: 0x40, format: 3, operands: 1 },
  'COMP': { mnemonic: 'COMP', opcode: 0x28, format: 3, operands: 1 },
  'COMPF': { mnemonic: 'COMPF', opcode: 0x88, format: 3, operands: 1 },
  'DIV': { mnemonic: 'DIV', opcode: 0x24, format: 3, operands: 1 },
  'DIVF': { mnemonic: 'DIVF', opcode: 0x64, format: 3, operands: 1 },
  'J': { mnemonic: 'J', opcode: 0x3C, format: 3, operands: 1 },
  'JEQ': { mnemonic: 'JEQ', opcode: 0x30, format: 3, operands: 1 },
  'JGT': { mnemonic: 'JGT', opcode: 0x34, format: 3, operands: 1 },
  'JLT': { mnemonic: 'JLT', opcode: 0x38, format: 3, operands: 1 },
  'JSUB': { mnemonic: 'JSUB', opcode: 0x48, format: 3, operands: 1 },
  'LDA': { mnemonic: 'LDA', opcode: 0x00, format: 3, operands: 1 },
  'LDB': { mnemonic: 'LDB', opcode: 0x68, format: 3, operands: 1 },
  'LDCH': { mnemonic: 'LDCH', opcode: 0x50, format: 3, operands: 1 },
  'LDF': { mnemonic: 'LDF', opcode: 0x70, format: 3, operands: 1 },
  'LDL': { mnemonic: 'LDL', opcode: 0x08, format: 3, operands: 1 },
  'LDS': { mnemonic: 'LDS', opcode: 0x6C, format: 3, operands: 1 },
  'LDT': { mnemonic: 'LDT', opcode: 0x74, format: 3, operands: 1 },
  'LDX': { mnemonic: 'LDX', opcode: 0x04, format: 3, operands: 1 },
  'LPS': { mnemonic: 'LPS', opcode: 0xD0, format: 3, operands: 1 },
  'MUL': { mnemonic: 'MUL', opcode: 0x20, format: 3, operands: 1 },
  'MULF': { mnemonic: 'MULF', opcode: 0x60, format: 3, operands: 1 },
  'OR': { mnemonic: 'OR', opcode: 0x44, format: 3, operands: 1 },
  'RD': { mnemonic: 'RD', opcode: 0xD8, format: 3, operands: 1 },
  'RSUB': { mnemonic: 'RSUB', opcode: 0x4C, format: 3, operands: 0 },
  'SSK': { mnemonic: 'SSK', opcode: 0xEC, format: 3, operands: 1 },
  'STA': { mnemonic: 'STA', opcode: 0x0C, format: 3, operands: 1 },
  'STB': { mnemonic: 'STB', opcode: 0x78, format: 3, operands: 1 },
  'STCH': { mnemonic: 'STCH', opcode: 0x54, format: 3, operands: 1 },
  'STF': { mnemonic: 'STF', opcode: 0x80, format: 3, operands: 1 },
  'STI': { mnemonic: 'STI', opcode: 0xD4, format: 3, operands: 1 },
  'STL': { mnemonic: 'STL', opcode: 0x14, format: 3, operands: 1 },
  'STS': { mnemonic: 'STS', opcode: 0x7C, format: 3, operands: 1 },
  'STSW': { mnemonic: 'STSW', opcode: 0xE8, format: 3, operands: 1 },
  'STT': { mnemonic: 'STT', opcode: 0x84, format: 3, operands: 1 },
  'STX': { mnemonic: 'STX', opcode: 0x10, format: 3, operands: 1 },
  'SUB': { mnemonic: 'SUB', opcode: 0x1C, format: 3, operands: 1 },
  'SUBF': { mnemonic: 'SUBF', opcode: 0x5C, format: 3, operands: 1 },
  'TD': { mnemonic: 'TD', opcode: 0xE0, format: 3, operands: 1 },
  'TIX': { mnemonic: 'TIX', opcode: 0x2C, format: 3, operands: 1 },
  'WD': { mnemonic: 'WD', opcode: 0xDC, format: 3, operands: 1 },

  // Format 2 Instructions (Register-to-Register)
  'ADDR': { mnemonic: 'ADDR', opcode: 0x90, format: 2, operands: 2 },
  'CLEAR': { mnemonic: 'CLEAR', opcode: 0xB4, format: 2, operands: 1 },
  'COMPR': { mnemonic: 'COMPR', opcode: 0xA0, format: 2, operands: 2 },
  'DIVR': { mnemonic: 'DIVR', opcode: 0x9C, format: 2, operands: 2 },
  'MULR': { mnemonic: 'MULR', opcode: 0x98, format: 2, operands: 2 },
  'RMO': { mnemonic: 'RMO', opcode: 0xAC, format: 2, operands: 2 },
  'SHIFTL': { mnemonic: 'SHIFTL', opcode: 0xA4, format: 2, operands: 2 },
  'SHIFTR': { mnemonic: 'SHIFTR', opcode: 0xA8, format: 2, operands: 2 },
  'SUBR': { mnemonic: 'SUBR', opcode: 0x94, format: 2, operands: 2 },
  'SVC': { mnemonic: 'SVC', opcode: 0xB0, format: 2, operands: 1 },
  'TIXR': { mnemonic: 'TIXR', opcode: 0xB8, format: 2, operands: 1 },

  // Format 1 Instructions (No Operands)
  'FIX': { mnemonic: 'FIX', opcode: 0xC4, format: 1, operands: 0 },
  'FLOAT': { mnemonic: 'FLOAT', opcode: 0xC0, format: 1, operands: 0 },
  'HIO': { mnemonic: 'HIO', opcode: 0xF4, format: 1, operands: 0 },
  'NORM': { mnemonic: 'NORM', opcode: 0xC8, format: 1, operands: 0 },
  'SIO': { mnemonic: 'SIO', opcode: 0xF0, format: 1, operands: 0 },
  'TIO': { mnemonic: 'TIO', opcode: 0xF8, format: 1, operands: 0 },
};

/**
 * Register Table
 * Maps register names to their numeric codes
 */
export const REGISTERS: RegisterTable = {
  'A': 0,
  'X': 1,
  'L': 2,
  'B': 3,
  'S': 4,
  'T': 5,
  'F': 6,
  'PC': 8,
  'SW': 9,
};

/**
 * Assembler Directives (not in OPTAB)
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
