/**
 * SIC/XE Assembler Type Definitions
 * All interfaces and types used throughout the assembler simulator
 */

// ============================================================================
// Source Code Representation
// ============================================================================

/**
 * Represents a single line of source code after lexing
 */
export interface SourceLine {
  lineNumber: number;
  label?: string;
  opcode: string;
  operand?: string;
  comment?: string;
  location?: number;
  objectCode?: string;
  isComment?: boolean;
  isEmpty?: boolean;
  isExtended?: boolean;
  error?: string;
}

/**
 * Result of tokenizing a single line
 */
export interface TokenizedLine extends SourceLine {
  rawLine: string;
  addressingPrefix?: '#' | '@';
  indexed?: boolean;
}

// ============================================================================
// Symbol and Operation Tables
// ============================================================================

/**
 * Symbol Table - maps labels to addresses
 */
export type SymbolTable = Record<string, number>;

/**
 * Entry in the Operation Table
 */
export interface OpcodeEntry {
  mnemonic: string;
  opcode: number; // Hex value, e.g., 0x18 for ADD
  format: 1 | 2 | 3; // Base format (3 can become 4 with +)
  operands: 0 | 1 | 2; // Number of operands required
}

/**
 * Operation Table type
 */
export type OperationTable = Record<string, OpcodeEntry>;

/**
 * Register codes for Format 2 instructions
 */
export type RegisterCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 8 | 9;

export interface RegisterEntry {
  name: string;
  code: RegisterCode;
}

export type RegisterTable = Record<string, RegisterCode>;

// ============================================================================
// Assembler Directives
// ============================================================================

export type DirectiveName =
  | 'START'
  | 'END'
  | 'BYTE'
  | 'WORD'
  | 'RESB'
  | 'RESW'
  | 'BASE'
  | 'NOBASE'
  | 'EQU'
  | 'ORG'
  | 'LTORG';

export const DIRECTIVES: DirectiveName[] = [
  'START', 'END', 'BYTE', 'WORD', 'RESB', 'RESW',
  'BASE', 'NOBASE', 'EQU', 'ORG', 'LTORG'
];

// ============================================================================
// Pass 1 Types
// ============================================================================

/**
 * Entry in the intermediate file (Pass 1 output)
 */
export interface IntermediateEntry {
  line: SourceLine;
  locctr: number | null;
  size: number;
  error?: string;
  symbolTableSnapshot?: SymbolTable;
}

/**
 * Result of Pass 1
 */
export interface Pass1Result {
  intermediateFile: IntermediateEntry[];
  symbolTable: SymbolTable;
  programName: string;
  startAddress: number;
  programLength: number;
  errors: AssemblerError[];
  success: boolean;
}

// ============================================================================
// Pass 2 Types
// ============================================================================

/**
 * Addressing mode flags (nixbpe)
 */
export interface NixbpeFlags {
  n: 0 | 1; // Indirect
  i: 0 | 1; // Immediate
  x: 0 | 1; // Indexed
  b: 0 | 1; // Base-relative
  p: 0 | 1; // PC-relative
  e: 0 | 1; // Extended (Format 4)
}

/**
 * Addressing mode types
 */
export type AddressingMode =
  | 'immediate'
  | 'indirect'
  | 'simple'
  | 'sic-compatible';

/**
 * Displacement calculation mode
 */
export type DisplacementMode =
  | 'PC-relative'
  | 'BASE-relative'
  | 'direct'
  | 'none';

/**
 * Result of calculating displacement
 */
export interface DisplacementResult {
  displacement: number | null;
  mode: DisplacementMode;
  error?: string;
}

/**
 * Result of detecting addressing mode
 */
export interface AddressingInfo {
  mode: AddressingMode;
  n: 0 | 1;
  i: 0 | 1;
  x: 0 | 1;
  prefix: '#' | '@' | null;
  isIndexed: boolean;
  cleanOperand: string;
}

/**
 * Entry in Pass 2 output
 */
export interface Pass2Entry {
  line: SourceLine;
  format: 1 | 2 | 3 | 4 | 0; // 0 for directives
  nixbpe: NixbpeFlags | null;
  targetAddress: number | null;
  displacement: number | null;
  displacementMode: DisplacementMode;
  addressingMode: AddressingMode | null;
  objectCode: string | null;
  needsModification: boolean;
  error?: string;
  // Detailed breakdown for visualization
  breakdown?: ObjectCodeBreakdown;
}

/**
 * Detailed breakdown of object code generation
 */
export interface ObjectCodeBreakdown {
  opcodeBits: string;
  nixbpeBits: string;
  displacementBits: string;
  fullBinary: string;
  fullHex: string;
  explanation: string;
}

/**
 * Result of Pass 2
 */
export interface Pass2Result {
  entries: Pass2Entry[];
  errors: AssemblerError[];
  success: boolean;
  baseRegister: number | null;
}

// ============================================================================
// Object Program Types
// ============================================================================

/**
 * Header Record structure
 */
export interface HeaderRecord {
  type: 'H';
  programName: string;
  startAddress: number;
  programLength: number;
  raw: string;
}

/**
 * Text Record structure
 */
export interface TextRecord {
  type: 'T';
  startAddress: number;
  length: number;
  objectCode: string;
  raw: string;
}

/**
 * Modification Record structure
 */
export interface ModificationRecord {
  type: 'M';
  address: number;
  length: number;
  symbol: string;
  sign: '+' | '-';
  raw: string;
}

/**
 * End Record structure
 */
export interface EndRecord {
  type: 'E';
  firstExecAddress: number;
  raw: string;
}

/**
 * Complete Object Program
 */
export interface ObjectProgram {
  programName: string;
  startAddress: number;
  programLength: number;
  header: HeaderRecord;
  textRecords: TextRecord[];
  modificationRecords: ModificationRecord[];
  endRecord: EndRecord;
  rawRecords: string[];
}

// ============================================================================
// Memory Types
// ============================================================================

/**
 * Memory byte type for visualization
 */
export type MemoryByteType =
  | 'code'
  | 'data'
  | 'reserved'
  | 'empty'
  | 'modified';

/**
 * Metadata for a memory byte
 */
export interface MemoryByteMetadata {
  address: number;
  value: number;
  type: MemoryByteType;
  sourceLineNumber?: number;
  instruction?: string;
  label?: string;
}

/**
 * Memory model
 */
export interface Memory {
  bytes: Uint8Array;
  programStart: number;
  programEnd: number;
  metadata: Map<number, MemoryByteMetadata>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Phase names for error tracking
 */
export type AssemblerPhaseType = 'lexer' | 'parser' | 'pass1' | 'pass2' | 'objectgen' | 'loader';

/**
 * Human-readable phase names
 */
export const PHASE_NAMES: Record<AssemblerPhaseType, string> = {
  lexer: 'Lexer (Tokenization)',
  parser: 'Parser (Syntax Check)',
  pass1: 'Pass 1 (Symbol Table)',
  pass2: 'Pass 2 (Object Code)',
  objectgen: 'Object Program Generation',
  loader: 'Memory Loader'
};

/**
 * Assembler error with detailed context
 */
export interface AssemblerError {
  /** Line number where error occurred (0 for general errors) */
  lineNumber: number;
  /** Error message describing the problem */
  message: string;
  /** Error severity */
  type: 'error' | 'warning';
  /** Which phase produced this error */
  phase: AssemblerPhaseType;
  /** The raw source line content (for context) */
  sourceLine?: string;
  /** Label on this line (if any) */
  label?: string;
  /** Opcode on this line (if any) */
  opcode?: string;
  /** Operand on this line (if any) */
  operand?: string;
  /** Additional details or suggestions for fixing */
  details?: string;
  /** Location counter at time of error (hex) */
  locctr?: string;
}

// ============================================================================
// Assembler State (for Zustand store)
// ============================================================================

export type AssemblerPhase =
  | 'idle'
  | 'lexing'
  | 'parsing'
  | 'pass1'
  | 'pass2'
  | 'generating'
  | 'loading'
  | 'complete'
  | 'error';

export interface AssemblerState {
  // Source
  sourceCode: string;

  // Phase tracking
  currentPhase: AssemblerPhase;

  // Lexer/Parser output
  tokenizedLines: TokenizedLine[];

  // Pass 1 output
  pass1Result: Pass1Result | null;

  // Pass 2 output
  pass2Result: Pass2Result | null;

  // Object program
  objectProgram: ObjectProgram | null;

  // Memory
  memory: Memory | null;

  // Errors
  errors: AssemblerError[];

  // UI state
  selectedLineNumber: number | null;
  selectedMemoryAddress: number | null;
}

// ============================================================================
// Example Programs
// ============================================================================

export interface ExampleProgram {
  name: string;
  description: string;
  code: string;
}
