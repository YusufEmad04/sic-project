/**
 * SIC/XE Memory Loader
 * Loads object program into simulated memory
 */

import {
  ObjectProgram,
  Memory,
  MemoryByteMetadata,
  MemoryByteType,
  Pass2Result
} from './types';
import { hexStringToBytes } from './objectProgram';

// Memory size: 1MB for SIC/XE (2^20 bytes)
export const MEMORY_SIZE = 1048576;

// SIC standard memory size: 32KB (2^15 bytes)
export const SIC_MEMORY_SIZE = 32768;

/**
 * Create an empty memory structure
 */
export function createEmptyMemory(size: number = MEMORY_SIZE): Memory {
  return {
    bytes: new Uint8Array(size),
    programStart: 0,
    programEnd: 0,
    metadata: new Map()
  };
}

/**
 * Load object program into memory
 */
export function loadObjectProgram(
  objectProgram: ObjectProgram,
  pass2Result?: Pass2Result,
  memorySize: number = MEMORY_SIZE
): Memory {
  const memory = createEmptyMemory(memorySize);

  // Parse header record
  memory.programStart = objectProgram.startAddress;
  memory.programEnd = objectProgram.startAddress + objectProgram.programLength;

  // Build address to source line mapping from Pass 2 result
  const addressToLine = new Map<number, { lineNumber: number; instruction: string; label?: string }>();

  if (pass2Result) {
    for (const entry of pass2Result.entries) {
      if (entry.line.location !== undefined && entry.objectCode) {
        addressToLine.set(entry.line.location, {
          lineNumber: entry.line.lineNumber,
          instruction: `${entry.line.opcode} ${entry.line.operand || ''}`.trim(),
          label: entry.line.label
        });
      }
    }
  }

  // Pre-compute instruction boundaries for O(1) lookup
  // Map each byte address to its instruction start address
  const byteToInstructionStart = new Map<number, number>();
  const sortedAddresses = Array.from(addressToLine.keys()).sort((a, b) => a - b);

  for (let i = 0; i < sortedAddresses.length; i++) {
    const startAddr = sortedAddresses[i];
    const endAddr = i < sortedAddresses.length - 1
      ? sortedAddresses[i + 1]
      : startAddr + 4; // Max instruction size for last instruction

    for (let addr = startAddr; addr < endAddr; addr++) {
      byteToInstructionStart.set(addr, startAddr);
    }
  }

  // Load text records
  for (const textRecord of objectProgram.textRecords) {
    const startAddr = textRecord.startAddress;
    const bytes = hexStringToBytes(textRecord.objectCode);

    for (let i = 0; i < bytes.length; i++) {
      const address = startAddr + i;

      if (address < memorySize) {
        memory.bytes[address] = bytes[i];

        // O(1) lookup for source info using pre-computed map
        const instructionStart = byteToInstructionStart.get(address);
        const sourceInfo = instructionStart !== undefined
          ? addressToLine.get(instructionStart)
          : undefined;

        memory.metadata.set(address, {
          address,
          value: bytes[i],
          type: 'code',
          sourceLineNumber: sourceInfo?.lineNumber,
          instruction: sourceInfo?.instruction,
          label: sourceInfo?.label
        });
      }
    }
  }

  // Mark modified addresses
  for (const modRecord of objectProgram.modificationRecords) {
    const startAddr = modRecord.address;
    const lengthBytes = Math.ceil(modRecord.length / 2); // Half-bytes to bytes

    for (let i = 0; i < lengthBytes; i++) {
      const address = startAddr + i;
      const existing = memory.metadata.get(address);

      if (existing) {
        memory.metadata.set(address, {
          ...existing,
          type: 'modified'
        });
      }
    }
  }

  return memory;
}

/**
 * Read a byte from memory
 */
export function readByte(memory: Memory, address: number): number {
  if (address < 0 || address >= memory.bytes.length) {
    throw new Error(`Memory address out of bounds: ${address}`);
  }
  return memory.bytes[address];
}

/**
 * Read a word (3 bytes) from memory
 */
export function readWord(memory: Memory, address: number): number {
  if (address < 0 || address + 2 >= memory.bytes.length) {
    throw new Error(`Memory address out of bounds: ${address}`);
  }
  return (memory.bytes[address] << 16) |
    (memory.bytes[address + 1] << 8) |
    memory.bytes[address + 2];
}

/**
 * Get memory byte metadata
 */
export function getByteMetadata(memory: Memory, address: number): MemoryByteMetadata {
  const existing = memory.metadata.get(address);

  if (existing) {
    return existing;
  }

  // Check if within program bounds
  let type: MemoryByteType = 'empty';
  if (address >= memory.programStart && address < memory.programEnd) {
    type = 'reserved';
  }

  return {
    address,
    value: memory.bytes[address] || 0,
    type
  };
}

/**
 * Get a range of memory bytes with metadata
 */
export function getMemoryRange(
  memory: Memory,
  startAddress: number,
  length: number
): MemoryByteMetadata[] {
  const result: MemoryByteMetadata[] = [];

  for (let i = 0; i < length; i++) {
    const address = startAddress + i;
    if (address < memory.bytes.length) {
      result.push(getByteMetadata(memory, address));
    }
  }

  return result;
}

/**
 * Format byte value for display
 */
export function formatByteHex(value: number): string {
  return value.toString(16).toUpperCase().padStart(2, '0');
}

/**
 * Format byte value as ASCII (if printable)
 */
export function formatByteAscii(value: number): string {
  if (value >= 32 && value <= 126) {
    return String.fromCharCode(value);
  }
  return '.';
}

/**
 * Format address for display
 */
export function formatAddress(address: number, digits: number = 6): string {
  return address.toString(16).toUpperCase().padStart(digits, '0');
}

/**
 * Get memory statistics
 */
export function getMemoryStats(memory: Memory): {
  totalSize: number;
  programSize: number;
  usedBytes: number;
  codeBytes: number;
  dataBytes: number;
  reservedBytes: number;
  modifiedBytes: number;
} {
  let codeBytes = 0;
  let dataBytes = 0;
  let reservedBytes = 0;
  let modifiedBytes = 0;

  for (const [, metadata] of memory.metadata) {
    switch (metadata.type) {
      case 'code':
        codeBytes++;
        break;
      case 'data':
        dataBytes++;
        break;
      case 'reserved':
        reservedBytes++;
        break;
      case 'modified':
        modifiedBytes++;
        break;
    }
  }

  return {
    totalSize: memory.bytes.length,
    programSize: memory.programEnd - memory.programStart,
    usedBytes: memory.metadata.size,
    codeBytes,
    dataBytes,
    reservedBytes,
    modifiedBytes
  };
}

/**
 * Dump memory to hex string format
 */
export function dumpMemory(
  memory: Memory,
  startAddress: number,
  length: number,
  bytesPerLine: number = 16
): string {
  const lines: string[] = [];

  for (let addr = startAddress; addr < startAddress + length; addr += bytesPerLine) {
    const hexParts: string[] = [];
    const asciiParts: string[] = [];

    for (let i = 0; i < bytesPerLine && addr + i < startAddress + length; i++) {
      const byte = memory.bytes[addr + i] || 0;
      hexParts.push(formatByteHex(byte));
      asciiParts.push(formatByteAscii(byte));
    }

    const addressStr = formatAddress(addr, 6);
    const hexStr = hexParts.join(' ');
    const asciiStr = asciiParts.join('');

    lines.push(`${addressStr}  ${hexStr.padEnd(bytesPerLine * 3 - 1)}  |${asciiStr}|`);
  }

  return lines.join('\n');
}
