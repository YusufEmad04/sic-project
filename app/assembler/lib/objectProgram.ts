/**
 * SIC/XE Object Program Generator
 * Generates H, T, M, E records from Pass 2 output
 */

import {
  Pass1Result,
  Pass2Result,
  ObjectProgram,
  HeaderRecord,
  TextRecord,
  ModificationRecord,
  EndRecord
} from './types';

/**
 * Generate complete object program from Pass 1 and Pass 2 results
 */
export function generateObjectProgram(
  pass1Result: Pass1Result,
  pass2Result: Pass2Result
): ObjectProgram {
  const { programName, startAddress, programLength } = pass1Result;

  // Generate header record
  const header = generateHeaderRecord(programName, startAddress, programLength);

  // Generate text records
  const textRecords = generateTextRecords(pass2Result);

  // Generate modification records
  const modificationRecords = generateModificationRecords(pass2Result, programName);

  // Generate end record
  const firstExecAddress = findFirstExecutableAddress(pass1Result, pass2Result);
  const endRecord = generateEndRecord(firstExecAddress);

  // Collect all raw records
  const rawRecords: string[] = [
    header.raw,
    ...textRecords.map(t => t.raw),
    ...modificationRecords.map(m => m.raw),
    endRecord.raw
  ];

  return {
    programName,
    startAddress,
    programLength,
    header,
    textRecords,
    modificationRecords,
    endRecord,
    rawRecords
  };
}

/**
 * Generate Header Record
 * Format: H^PROGNAME^STARTADDR^LENGTH
 * - PROGNAME: 6 characters, left-justified, padded with spaces
 * - STARTADDR: 6 hex digits
 * - LENGTH: 6 hex digits
 */
function generateHeaderRecord(
  programName: string,
  startAddress: number,
  programLength: number
): HeaderRecord {
  const name = programName.substring(0, 6).padEnd(6, ' ');
  const start = startAddress.toString(16).toUpperCase().padStart(6, '0');
  const length = programLength.toString(16).toUpperCase().padStart(6, '0');

  const raw = `H^${name}^${start}^${length}`;

  return {
    type: 'H',
    programName: name,
    startAddress,
    programLength,
    raw
  };
}

/**
 * Generate Text Records
 * Format: T^STARTADDR^LENGTH^OBJECTCODE
 * - STARTADDR: 6 hex digits
 * - LENGTH: 2 hex digits (number of bytes, max 30)
 * - OBJECTCODE: up to 60 hex characters (30 bytes)
 */
function generateTextRecords(pass2Result: Pass2Result): TextRecord[] {
  const records: TextRecord[] = [];
  let currentStart: number | null = null;
  let currentBytes: string[] = [];
  let currentByteCount = 0;

  for (const entry of pass2Result.entries) {
    // Skip entries without object code
    if (!entry.objectCode) {
      // If we have accumulated bytes, finalize the current record
      if (currentBytes.length > 0 && currentStart !== null) {
        records.push(finalizeTextRecord(currentStart, currentBytes, currentByteCount));
        currentStart = null;
        currentBytes = [];
        currentByteCount = 0;
      }
      continue;
    }

    const objectCodeBytes = entry.objectCode.length / 2; // 2 hex chars = 1 byte
    const location = entry.line.location ?? 0;

    // Check if we need to start a new record
    if (currentStart === null) {
      // Start new record
      currentStart = location;
      currentBytes = [entry.objectCode];
      currentByteCount = objectCodeBytes;
    } else if (currentByteCount + objectCodeBytes > 30) {
      // Current record is full, finalize it
      records.push(finalizeTextRecord(currentStart, currentBytes, currentByteCount));

      // Start new record
      currentStart = location;
      currentBytes = [entry.objectCode];
      currentByteCount = objectCodeBytes;
    } else {
      // Add to current record
      currentBytes.push(entry.objectCode);
      currentByteCount += objectCodeBytes;
    }
  }

  // Don't forget the last record
  if (currentBytes.length > 0 && currentStart !== null) {
    records.push(finalizeTextRecord(currentStart, currentBytes, currentByteCount));
  }

  return records;
}

/**
 * Finalize a text record
 */
function finalizeTextRecord(
  startAddress: number,
  objectCodes: string[],
  byteCount: number
): TextRecord {
  const start = startAddress.toString(16).toUpperCase().padStart(6, '0');
  const length = byteCount.toString(16).toUpperCase().padStart(2, '0');
  const objectCode = objectCodes.join('');

  const raw = `T^${start}^${length}^${objectCode}`;

  return {
    type: 'T',
    startAddress,
    length: byteCount,
    objectCode,
    raw
  };
}

/**
 * Generate Modification Records
 * Format: M^ADDRESS^LENGTH^+PROGNAME
 * - ADDRESS: 6 hex digits (starting address of field to modify)
 * - LENGTH: 2 hex digits (length in half-bytes)
 * 
 * Modification records are needed for Format 4 instructions that
 * reference relocatable symbols.
 */
function generateModificationRecords(
  pass2Result: Pass2Result,
  programName: string
): ModificationRecord[] {
  const records: ModificationRecord[] = [];

  for (const entry of pass2Result.entries) {
    if (entry.needsModification && entry.format === 4) {
      const location = entry.line.location ?? 0;

      // Address to modify is location + 1 (skip the opcode+nixbpe byte)
      const modAddress = location + 1;

      // Length is 5 half-bytes (20 bits for Format 4 address)
      const length = 5;

      const address = modAddress.toString(16).toUpperCase().padStart(6, '0');
      const lengthHex = length.toString(16).toUpperCase().padStart(2, '0');

      const raw = `M^${address}^${lengthHex}^+${programName.substring(0, 6)}`;

      records.push({
        type: 'M',
        address: modAddress,
        length,
        symbol: programName,
        sign: '+',
        raw
      });
    }
  }

  return records;
}

/**
 * Generate End Record
 * Format: E^FIRSTEXEC
 * - FIRSTEXEC: 6 hex digits (address of first executable instruction)
 */
function generateEndRecord(firstExecAddress: number): EndRecord {
  const address = firstExecAddress.toString(16).toUpperCase().padStart(6, '0');
  const raw = `E^${address}`;

  return {
    type: 'E',
    firstExecAddress,
    raw
  };
}

/**
 * Find the address of the first executable instruction
 * This is typically specified in the END directive operand,
 * or defaults to the start address.
 */
function findFirstExecutableAddress(
  pass1Result: Pass1Result,
  pass2Result: Pass2Result
): number {
  // Look for END directive with operand
  for (const entry of pass2Result.entries) {
    if (entry.line.opcode?.toUpperCase() === 'END' && entry.line.operand) {
      // Check symbol table
      const symbol = entry.line.operand.toUpperCase();
      if (symbol in pass1Result.symbolTable) {
        return pass1Result.symbolTable[symbol];
      }
    }
  }

  // Default to start address
  return pass1Result.startAddress;
}

/**
 * Format object program as string for display
 */
export function formatObjectProgram(program: ObjectProgram): string {
  return program.rawRecords.join('\n');
}

/**
 * Parse a hex string to byte array
 */
export function hexStringToBytes(hex: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.substring(i, i + 2), 16));
  }
  return bytes;
}

/**
 * Explain a record for educational purposes
 */
export function explainRecord(record: string): string {
  const parts = record.split('^');
  const type = parts[0];

  switch (type) {
    case 'H':
      return `Header Record:
  - Program Name: "${parts[1]}"
  - Starting Address: 0x${parts[2]} (${parseInt(parts[2], 16)} decimal)
  - Program Length: 0x${parts[3]} (${parseInt(parts[3], 16)} bytes)`;

    case 'T':
      return `Text Record:
  - Starting Address: 0x${parts[1]}
  - Length: ${parseInt(parts[2], 16)} bytes
  - Object Code: ${parts[3]}`;

    case 'M':
      return `Modification Record:
  - Address to Modify: 0x${parts[1]}
  - Length: ${parseInt(parts[2], 16)} half-bytes
  - Modification: ${parts[3]} (add program start address)`;

    case 'E':
      return `End Record:
  - First Executable Address: 0x${parts[1]}`;

    default:
      return `Unknown record type: ${type}`;
  }
}
