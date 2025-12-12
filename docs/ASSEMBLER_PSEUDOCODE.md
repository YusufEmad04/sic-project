# 📖 SIC/XE Assembler — Pseudo-Code Documentation

This document provides detailed pseudo-code algorithms for each step of the SIC/XE assembler simulator. Use this as a reference for implementation.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Data Structures](#2-data-structures)
3. [Lexer Algorithm](#3-lexer-algorithm)
4. [Parser Algorithm](#4-parser-algorithm)
5. [Pass 1 Algorithm](#5-pass-1-algorithm)
6. [Pass 2 Algorithm](#6-pass-2-algorithm)
7. [Object Program Generation](#7-object-program-generation)
8. [Memory Loader Algorithm](#8-memory-loader-algorithm)
9. [Displacement Calculation](#9-displacement-calculation)
10. [Instruction Format Detection](#10-instruction-format-detection)
11. [Addressing Mode Detection](#11-addressing-mode-detection)

---

## 1. Overview

The SIC/XE assembler is a **two-pass assembler** that translates assembly source code into machine code (object program). The process involves:

1. **Lexing**: Tokenize raw source text into structured tokens
2. **Parsing**: Validate syntax and build source line records
3. **Pass 1**: Build symbol table, assign addresses (LOCCTR)
4. **Pass 2**: Generate object code using symbol table
5. **Object Program**: Format output as H/T/M/E records
6. **Memory Loading**: Load object code into simulated memory

---

## 2. Data Structures

### 2.1 Source Line
```
SourceLine {
    lineNumber: integer
    label: string or null
    opcode: string
    operand: string or null
    comment: string or null
    location: integer or null      // Set in Pass 1
    objectCode: string or null     // Set in Pass 2
}
```

### 2.2 Symbol Table (SYMTAB)
```
SYMTAB = Map<string, integer>
// Key: symbol name (label)
// Value: address (location counter value)
```

### 2.3 Operation Table (OPTAB)
```
OPTAB = Map<string, OpcodeEntry>

OpcodeEntry {
    opcode: integer (hex)      // e.g., 0x18 for ADD
    format: integer            // 1, 2, 3, or 4
    operandCount: integer      // 0, 1, or 2
}
```

### 2.4 Intermediate Entry (Pass 1 Output)
```
IntermediateEntry {
    line: SourceLine
    locctr: integer
    error: string or null
}
```

### 2.5 Pass 2 Entry
```
Pass2Entry {
    line: SourceLine
    format: integer                    // 1, 2, 3, or 4
    nixbpe: { n, i, x, b, p, e }       // boolean flags
    targetAddress: integer or null
    displacement: integer or null
    addressingMode: string             // "immediate", "indirect", "simple", "indexed"
    objectCode: string
    baseRelative: boolean
    pcRelative: boolean
}
```

### 2.6 Object Program
```
ObjectProgram {
    programName: string
    startAddress: integer
    programLength: integer
    header: string           // H record
    textRecords: string[]    // T records
    modRecords: string[]     // M records
    endRecord: string        // E record
}
```

### 2.7 Memory Model
```
Memory {
    bytes: Uint8Array[1048576]   // 1MB for SIC/XE
    programStart: integer
    programEnd: integer
    metadata: Map<address, {
        sourceLineNumber: integer
        instruction: string
        type: "code" | "data" | "reserved"
    }>
}
```

---

## 3. Lexer Algorithm

The lexer tokenizes each line of source code into its components.

### 3.1 Pseudo-Code
```
FUNCTION tokenizeLine(rawLine: string, lineNumber: integer) -> SourceLine:
    // Remove leading/trailing whitespace
    line = trim(rawLine)
    
    // Handle empty lines
    IF line is empty:
        RETURN SourceLine { lineNumber, opcode: "", isComment: false, isEmpty: true }
    
    // Handle comment-only lines (start with .)
    IF line starts with '.':
        RETURN SourceLine { lineNumber, comment: line, isComment: true }
    
    // Initialize result
    result = SourceLine { lineNumber }
    
    // Check for inline comment
    commentIndex = indexOf(line, '.')
    IF commentIndex >= 0:
        result.comment = substring(line, commentIndex)
        line = substring(line, 0, commentIndex)
        line = trim(line)
    
    // Split by whitespace
    tokens = splitByWhitespace(line)
    
    // Determine if first token is a label
    // Labels start at column 0 (no leading whitespace in original)
    // Or we check if first token is in OPTAB/directives
    
    IF rawLine does NOT start with whitespace AND length(tokens) >= 1:
        // First token might be a label
        IF tokens[0] is NOT in OPTAB AND tokens[0] is NOT a directive:
            result.label = tokens[0]
            tokens = tokens[1:]  // Remove label from tokens
        ELSE IF length(tokens) >= 2:
            // Could still be a label if next token is valid opcode
            result.label = tokens[0]
            tokens = tokens[1:]
    
    // Next token is opcode
    IF length(tokens) >= 1:
        result.opcode = toUpperCase(tokens[0])
        tokens = tokens[1:]
    
    // Remaining tokens are operand
    IF length(tokens) >= 1:
        result.operand = join(tokens, ',')  // Handle "BUFFER,X" etc.
    
    RETURN result
```

### 3.2 Special Cases
```
Handle extended format prefix:
    IF opcode starts with '+':
        result.isExtended = true
        result.opcode = substring(opcode, 1)  // Remove '+'

Handle addressing prefixes in operand:
    IF operand starts with '#':
        result.addressingPrefix = "immediate"
        result.operand = substring(operand, 1)
    ELSE IF operand starts with '@':
        result.addressingPrefix = "indirect"
        result.operand = substring(operand, 1)

Handle indexed addressing:
    IF operand contains ',X':
        result.indexed = true
        result.operand = remove ',X' from operand
```

---

## 4. Parser Algorithm

The parser validates the syntax and structure of tokenized lines.

### 4.1 Pseudo-Code
```
FUNCTION parseLine(sourceLine: SourceLine) -> ParseResult:
    errors = []
    
    // Skip empty lines and comments
    IF sourceLine.isEmpty OR sourceLine.isComment:
        RETURN ParseResult { valid: true, sourceLine }
    
    // Validate label (if present)
    IF sourceLine.label is not null:
        IF not isValidLabel(sourceLine.label):
            errors.push("Invalid label format: " + sourceLine.label)
    
    // Validate opcode
    IF sourceLine.opcode is null OR sourceLine.opcode is empty:
        errors.push("Missing opcode")
    ELSE:
        opcode = sourceLine.opcode
        IF opcode starts with '+':
            opcode = substring(opcode, 1)
        
        IF opcode not in OPTAB AND opcode not in DIRECTIVES:
            errors.push("Invalid opcode: " + opcode)
    
    // Validate operand based on opcode
    IF sourceLine.opcode in OPTAB:
        entry = OPTAB[sourceLine.opcode]
        IF entry.operandCount > 0 AND sourceLine.operand is null:
            errors.push("Missing operand for " + sourceLine.opcode)
    
    // Validate directive operands
    IF sourceLine.opcode == "START":
        IF not isValidHexNumber(sourceLine.operand):
            errors.push("START requires hex address")
    
    IF sourceLine.opcode == "BYTE":
        IF not isValidByteConstant(sourceLine.operand):
            errors.push("Invalid BYTE constant")
    
    IF sourceLine.opcode == "WORD":
        IF not isValidNumber(sourceLine.operand):
            errors.push("Invalid WORD value")
    
    IF sourceLine.opcode in ["RESB", "RESW"]:
        IF not isPositiveInteger(sourceLine.operand):
            errors.push("Reserve directives require positive integer")
    
    RETURN ParseResult {
        valid: length(errors) == 0,
        errors: errors,
        sourceLine: sourceLine
    }

FUNCTION isValidLabel(label: string) -> boolean:
    // Must start with letter, contain only alphanumeric, max 6 chars
    RETURN matches(label, /^[A-Za-z][A-Za-z0-9]{0,5}$/)

FUNCTION isValidByteConstant(operand: string) -> boolean:
    // C'...' for character or X'...' for hex
    RETURN matches(operand, /^C'.+'$/) OR matches(operand, /^X'[0-9A-Fa-f]+'$/)
```

---

## 5. Pass 1 Algorithm

Pass 1 builds the symbol table and assigns addresses to each instruction/directive.

### 5.1 Main Algorithm
```
FUNCTION pass1(sourceLines: SourceLine[]) -> Pass1Result:
    SYMTAB = new Map()
    intermediateFile = []
    errors = []
    LOCCTR = 0
    startAddress = 0
    programName = ""
    
    FOR EACH line IN sourceLines:
        // Skip empty lines and comments
        IF line.isEmpty OR line.isComment:
            intermediateFile.push({ line, locctr: null })
            CONTINUE
        
        // Handle START directive
        IF line.opcode == "START":
            startAddress = parseHex(line.operand) OR 0
            LOCCTR = startAddress
            programName = line.label OR "PROG"
            line.location = LOCCTR
            intermediateFile.push({ line, locctr: LOCCTR })
            CONTINUE
        
        // Handle END directive
        IF line.opcode == "END":
            line.location = LOCCTR
            intermediateFile.push({ line, locctr: LOCCTR })
            BREAK
        
        // Save current location for this line
        line.location = LOCCTR
        
        // Process label (add to SYMTAB)
        IF line.label is not null:
            IF line.label IN SYMTAB:
                errors.push({
                    line: line.lineNumber,
                    message: "Duplicate symbol: " + line.label
                })
            ELSE:
                SYMTAB[line.label] = LOCCTR
        
        // Calculate instruction/directive size and increment LOCCTR
        size = calculateSize(line)
        
        // Add to intermediate file
        intermediateFile.push({
            line: line,
            locctr: LOCCTR,
            size: size
        })
        
        LOCCTR = LOCCTR + size
    
    programLength = LOCCTR - startAddress
    
    RETURN Pass1Result {
        intermediateFile: intermediateFile,
        symbolTable: SYMTAB,
        programName: programName,
        startAddress: startAddress,
        programLength: programLength,
        errors: errors
    }
```

### 5.2 Size Calculation
```
FUNCTION calculateSize(line: SourceLine) -> integer:
    opcode = line.opcode
    
    // Handle extended format
    IF opcode starts with '+':
        RETURN 4  // Format 4
    
    // Handle directives
    SWITCH opcode:
        CASE "START", "END", "BASE", "NOBASE":
            RETURN 0
        
        CASE "BYTE":
            RETURN calculateByteSize(line.operand)
        
        CASE "WORD":
            RETURN 3
        
        CASE "RESB":
            RETURN parseInt(line.operand)
        
        CASE "RESW":
            RETURN parseInt(line.operand) * 3
    
    // Handle instructions from OPTAB
    IF opcode IN OPTAB:
        RETURN OPTAB[opcode].format
    
    // Unknown opcode
    RETURN 0

FUNCTION calculateByteSize(operand: string) -> integer:
    IF operand starts with "C'":
        // Character constant: C'EOF' = 3 bytes
        content = extractBetween(operand, "C'", "'")
        RETURN length(content)
    
    IF operand starts with "X'":
        // Hex constant: X'F1' = 1 byte (2 hex digits = 1 byte)
        content = extractBetween(operand, "X'", "'")
        RETURN length(content) / 2
    
    RETURN 0
```

---

## 6. Pass 2 Algorithm

Pass 2 generates object code using the symbol table from Pass 1.

### 6.1 Main Algorithm
```
FUNCTION pass2(pass1Result: Pass1Result) -> Pass2Result:
    intermediateFile = pass1Result.intermediateFile
    SYMTAB = pass1Result.symbolTable
    
    pass2Entries = []
    errors = []
    BASE = null  // BASE register value (set by BASE directive)
    
    FOR EACH entry IN intermediateFile:
        line = entry.line
        
        // Skip empty/comment lines
        IF line.isEmpty OR line.isComment:
            pass2Entries.push({ line, objectCode: null })
            CONTINUE
        
        // Handle directives
        IF line.opcode == "START":
            pass2Entries.push({ line, objectCode: null })
            CONTINUE
        
        IF line.opcode == "END":
            pass2Entries.push({ line, objectCode: null })
            BREAK
        
        IF line.opcode == "BASE":
            // Set BASE register to operand value
            IF line.operand IN SYMTAB:
                BASE = SYMTAB[line.operand]
            ELSE:
                BASE = parseNumber(line.operand)
            pass2Entries.push({ line, objectCode: null })
            CONTINUE
        
        IF line.opcode == "NOBASE":
            BASE = null
            pass2Entries.push({ line, objectCode: null })
            CONTINUE
        
        // Generate object code
        result = generateObjectCode(line, entry.locctr, SYMTAB, BASE)
        
        IF result.error:
            errors.push({ line: line.lineNumber, message: result.error })
        
        line.objectCode = result.objectCode
        pass2Entries.push({
            line: line,
            objectCode: result.objectCode,
            format: result.format,
            nixbpe: result.nixbpe,
            targetAddress: result.targetAddress,
            displacement: result.displacement,
            addressingMode: result.addressingMode,
            needsModification: result.needsModification
        })
    
    RETURN Pass2Result {
        entries: pass2Entries,
        errors: errors
    }
```

### 6.2 Object Code Generation
```
FUNCTION generateObjectCode(line, currentLocctr, SYMTAB, BASE) -> ObjectCodeResult:
    opcode = line.opcode
    operand = line.operand
    
    // Handle directives that generate code
    IF opcode == "BYTE":
        RETURN generateByteCode(operand)
    
    IF opcode == "WORD":
        RETURN generateWordCode(operand, SYMTAB)
    
    IF opcode IN ["RESB", "RESW"]:
        RETURN { objectCode: null }  // No object code, just reserved space
    
    // Handle instructions
    isExtended = opcode starts with '+'
    IF isExtended:
        opcode = substring(opcode, 1)
    
    IF opcode NOT IN OPTAB:
        RETURN { error: "Unknown opcode: " + opcode }
    
    opcodeEntry = OPTAB[opcode]
    format = isExtended ? 4 : opcodeEntry.format
    
    SWITCH format:
        CASE 1:
            RETURN generateFormat1(opcodeEntry)
        CASE 2:
            RETURN generateFormat2(opcodeEntry, operand)
        CASE 3:
            RETURN generateFormat3(opcodeEntry, operand, currentLocctr, SYMTAB, BASE)
        CASE 4:
            RETURN generateFormat4(opcodeEntry, operand, SYMTAB)
    
    RETURN { error: "Invalid format" }
```

---

## 7. Object Program Generation

Generate H, T, M, E records from Pass 2 output.

### 7.1 Header Record
```
FUNCTION generateHeaderRecord(programName, startAddress, programLength) -> string:
    // Format: H^PROGNAME^STARTADDR^LENGTH
    // PROGNAME: 6 characters, left-justified, padded with spaces
    // STARTADDR: 6 hex digits
    // LENGTH: 6 hex digits
    
    name = padRight(programName, 6, ' ')
    start = padLeft(toHex(startAddress), 6, '0')
    length = padLeft(toHex(programLength), 6, '0')
    
    RETURN "H^" + name + "^" + start + "^" + length
```

### 7.2 Text Records
```
FUNCTION generateTextRecords(pass2Entries) -> string[]:
    records = []
    currentRecord = null
    currentStart = 0
    currentBytes = []
    
    FOR EACH entry IN pass2Entries:
        IF entry.objectCode is null:
            // Break in code (RESB, RESW, etc.)
            IF currentBytes.length > 0:
                records.push(finalizeTextRecord(currentStart, currentBytes))
                currentBytes = []
                currentRecord = null
            CONTINUE
        
        objectCodeBytes = hexStringToBytes(entry.objectCode)
        
        // Check if we need to start a new record
        // T records max 30 bytes (60 hex characters)
        IF currentRecord is null:
            currentStart = entry.line.location
            currentBytes = objectCodeBytes
        ELSE IF currentBytes.length + objectCodeBytes.length > 30:
            // Finalize current record and start new one
            records.push(finalizeTextRecord(currentStart, currentBytes))
            currentStart = entry.line.location
            currentBytes = objectCodeBytes
        ELSE:
            // Add to current record
            currentBytes = concat(currentBytes, objectCodeBytes)
    
    // Don't forget the last record
    IF currentBytes.length > 0:
        records.push(finalizeTextRecord(currentStart, currentBytes))
    
    RETURN records

FUNCTION finalizeTextRecord(startAddress, bytes) -> string:
    // Format: T^STARTADDR^LENGTH^OBJECTCODE
    // STARTADDR: 6 hex digits
    // LENGTH: 2 hex digits (number of bytes)
    // OBJECTCODE: up to 60 hex characters
    
    start = padLeft(toHex(startAddress), 6, '0')
    length = padLeft(toHex(bytes.length), 2, '0')
    code = bytesToHexString(bytes)
    
    RETURN "T^" + start + "^" + length + "^" + code
```

### 7.3 Modification Records
```
FUNCTION generateModificationRecords(pass2Entries, programName) -> string[]:
    records = []
    
    FOR EACH entry IN pass2Entries:
        IF entry.needsModification:
            // Format 4 instructions with relocatable addresses need modification
            // Format: M^ADDRESS^LENGTH^+PROGNAME
            // ADDRESS: 6 hex digits (address of field to modify + 1 for nixbpe byte)
            // LENGTH: 2 hex digits (usually 05 for 20-bit address)
            
            address = padLeft(toHex(entry.line.location + 1), 6, '0')
            length = "05"  // 5 half-bytes = 20 bits
            
            records.push("M^" + address + "^" + length + "^+" + programName)
    
    RETURN records
```

### 7.4 End Record
```
FUNCTION generateEndRecord(firstExecAddress) -> string:
    // Format: E^FIRSTEXEC
    // FIRSTEXEC: 6 hex digits (address of first executable instruction)
    
    address = padLeft(toHex(firstExecAddress), 6, '0')
    RETURN "E^" + address
```

---

## 8. Memory Loader Algorithm

Load object program into simulated memory.

### 8.1 Main Algorithm
```
FUNCTION loadObjectProgram(objectProgram: ObjectProgram) -> Memory:
    // Initialize memory (1MB for SIC/XE)
    memory = new Uint8Array(1048576)
    metadata = new Map()
    
    // Parse header record
    header = parseHeaderRecord(objectProgram.header)
    programStart = header.startAddress
    programLength = header.programLength
    
    // Load text records
    FOR EACH textRecord IN objectProgram.textRecords:
        parsed = parseTextRecord(textRecord)
        startAddr = parsed.startAddress
        bytes = parsed.bytes
        
        FOR i = 0 TO bytes.length - 1:
            memory[startAddr + i] = bytes[i]
            metadata[startAddr + i] = {
                type: "code",
                sourceRecord: textRecord
            }
    
    // Apply modification records (for relocation)
    FOR EACH modRecord IN objectProgram.modRecords:
        parsed = parseModRecord(modRecord)
        applyModification(memory, parsed)
    
    RETURN Memory {
        bytes: memory,
        programStart: programStart,
        programEnd: programStart + programLength,
        metadata: metadata
    }
```

### 8.2 Parse Records
```
FUNCTION parseHeaderRecord(record: string) -> HeaderInfo:
    // H^PROGNAME^STARTADDR^LENGTH
    parts = split(record, '^')
    RETURN {
        programName: trim(parts[1]),
        startAddress: parseHex(parts[2]),
        programLength: parseHex(parts[3])
    }

FUNCTION parseTextRecord(record: string) -> TextInfo:
    // T^STARTADDR^LENGTH^OBJECTCODE
    parts = split(record, '^')
    RETURN {
        startAddress: parseHex(parts[1]),
        length: parseHex(parts[2]),
        bytes: hexStringToBytes(parts[3])
    }

FUNCTION parseModRecord(record: string) -> ModInfo:
    // M^ADDRESS^LENGTH^+PROGNAME
    parts = split(record, '^')
    RETURN {
        address: parseHex(parts[1]),
        length: parseHex(parts[2]),
        sign: parts[3][0],  // '+' or '-'
        symbol: substring(parts[3], 1)
    }
```

---

## 9. Displacement Calculation

Calculate displacement for PC-relative and BASE-relative addressing.

### 9.1 Algorithm
```
FUNCTION calculateDisplacement(targetAddress, currentLocctr, instructionSize, BASE) -> DisplacementResult:
    // PC points to NEXT instruction after current one is fetched
    PC = currentLocctr + instructionSize
    
    // Try PC-relative first (preferred)
    pcDisplacement = targetAddress - PC
    
    // PC-relative displacement must fit in 12 bits signed (-2048 to 2047)
    IF pcDisplacement >= -2048 AND pcDisplacement <= 2047:
        RETURN {
            displacement: pcDisplacement,
            mode: "PC-relative",
            flags: { p: 1, b: 0 }
        }
    
    // Try BASE-relative if BASE is set
    IF BASE is not null:
        baseDisplacement = targetAddress - BASE
        
        // BASE-relative displacement must fit in 12 bits unsigned (0 to 4095)
        IF baseDisplacement >= 0 AND baseDisplacement <= 4095:
            RETURN {
                displacement: baseDisplacement,
                mode: "BASE-relative",
                flags: { p: 0, b: 1 }
            }
    
    // Neither works - need extended format (Format 4)
    RETURN {
        error: "Displacement out of range, use extended format (+)",
        displacement: null
    }
```

### 9.2 Example
```
Example: LDA BUFFER
    Current LOCCTR = 0x0006
    Instruction size = 3 (Format 3)
    PC after fetch = 0x0006 + 3 = 0x0009
    BUFFER address (from SYMTAB) = 0x0036
    
    PC-relative: 0x0036 - 0x0009 = 0x002D (45 decimal)
    45 is within -2048 to 2047, so PC-relative works!
    
    Displacement = 0x02D (12 bits)
    Flags: n=1, i=1, x=0, b=0, p=1, e=0
```

---

## 10. Instruction Format Detection

Determine instruction format based on opcode and prefix.

### 10.1 Algorithm
```
FUNCTION detectFormat(line: SourceLine, OPTAB) -> integer:
    opcode = line.opcode
    
    // Check for extended format prefix
    IF opcode starts with '+':
        RETURN 4
    
    // Look up in OPTAB
    IF opcode IN OPTAB:
        RETURN OPTAB[opcode].format
    
    // Directives don't have formats
    RETURN 0
```

### 10.2 Format Structures
```
Format 1 (1 byte):
    | 8-bit opcode |
    Example: FIX, FLOAT, NORM

Format 2 (2 bytes):
    | 8-bit opcode | 4-bit r1 | 4-bit r2 |
    Example: ADDR A,S → 90 04
    
Format 3 (3 bytes):
    | 6-bit opcode | n | i | x | b | p | e=0 | 12-bit displacement |
    Bits:    23-18   17  16  15  14  13  12       11-0
    Example: LDA BUFFER → 032XXX
    
Format 4 (4 bytes):
    | 6-bit opcode | n | i | x | b | p | e=1 | 20-bit address |
    Bits:    31-26   25  24  23  22  21  20       19-0
    Example: +LDA BUFFER → 032XXXXX
```

---

## 11. Addressing Mode Detection

Detect addressing mode from operand syntax.

### 11.1 Algorithm
```
FUNCTION detectAddressingMode(operand: string) -> AddressingInfo:
    result = {
        mode: "simple",
        n: 1,
        i: 1,
        x: 0,
        prefix: null,
        isIndexed: false,
        cleanOperand: operand
    }
    
    IF operand is null OR operand is empty:
        RETURN result
    
    // Check for immediate addressing (#)
    IF operand starts with '#':
        result.mode = "immediate"
        result.n = 0
        result.i = 1
        result.prefix = '#'
        result.cleanOperand = substring(operand, 1)
    
    // Check for indirect addressing (@)
    ELSE IF operand starts with '@':
        result.mode = "indirect"
        result.n = 1
        result.i = 0
        result.prefix = '@'
        result.cleanOperand = substring(operand, 1)
    
    // Check for indexed addressing (,X)
    IF result.cleanOperand ends with ',X':
        result.isIndexed = true
        result.x = 1
        result.cleanOperand = removeSuffix(result.cleanOperand, ',X')
    
    RETURN result
```

### 11.2 Addressing Mode Summary
```
+-----+-----+--------------------------------------+
|  n  |  i  |  Addressing Mode                     |
+-----+-----+--------------------------------------+
|  0  |  0  |  SIC compatible (direct)             |
|  0  |  1  |  Immediate (#value)                  |
|  1  |  0  |  Indirect (@address)                 |
|  1  |  1  |  Simple (direct) - SIC/XE default    |
+-----+-----+--------------------------------------+

With x=1: Add (X) register to target address (indexed)
```

### 11.3 Complete nixbpe Calculation
```
FUNCTION calculateNixbpe(addressingInfo, displacementResult, isExtended) -> NixbpeFlags:
    RETURN {
        n: addressingInfo.n,
        i: addressingInfo.i,
        x: addressingInfo.x,
        b: displacementResult.flags.b OR 0,
        p: displacementResult.flags.p OR 0,
        e: isExtended ? 1 : 0
    }
```

---

## Appendix A: Register Codes

```
+----------+------+
| Register | Code |
+----------+------+
|    A     |  0   |
|    X     |  1   |
|    L     |  2   |
|    B     |  3   |
|    S     |  4   |
|    T     |  5   |
|    F     |  6   |
|   PC     |  8   |
|   SW     |  9   |
+----------+------+
```

---

## Appendix B: Common Opcodes

```
+----------+--------+--------+
| Mnemonic | Opcode | Format |
+----------+--------+--------+
|   ADD    |   18   |  3/4   |
|   AND    |   40   |  3/4   |
|   COMP   |   28   |  3/4   |
|   DIV    |   24   |  3/4   |
|   J      |   3C   |  3/4   |
|   JEQ    |   30   |  3/4   |
|   JGT    |   34   |  3/4   |
|   JLT    |   38   |  3/4   |
|   JSUB   |   48   |  3/4   |
|   LDA    |   00   |  3/4   |
|   LDB    |   68   |  3/4   |
|   LDCH   |   50   |  3/4   |
|   LDL    |   08   |  3/4   |
|   LDS    |   6C   |  3/4   |
|   LDT    |   74   |  3/4   |
|   LDX    |   04   |  3/4   |
|   MUL    |   20   |  3/4   |
|   OR     |   44   |  3/4   |
|   RD     |   D8   |  3/4   |
|   RSUB   |   4C   |  3/4   |
|   STA    |   0C   |  3/4   |
|   STB    |   78   |  3/4   |
|   STCH   |   54   |  3/4   |
|   STL    |   14   |  3/4   |
|   STS    |   7C   |  3/4   |
|   STT    |   84   |  3/4   |
|   STX    |   10   |  3/4   |
|   SUB    |   1C   |  3/4   |
|   TD     |   E0   |  3/4   |
|   TIX    |   2C   |  3/4   |
|   WD     |   DC   |  3/4   |
+----------+--------+--------+
|  ADDR    |   90   |   2    |
|  CLEAR   |   B4   |   2    |
|  COMPR   |   A0   |   2    |
|  DIVR    |   9C   |   2    |
|  MULR    |   98   |   2    |
|  RMO     |   AC   |   2    |
|  SHIFTL  |   A4   |   2    |
|  SHIFTR  |   A8   |   2    |
|  SUBR    |   94   |   2    |
|  SVC     |   B0   |   2    |
|  TIXR    |   B8   |   2    |
+----------+--------+--------+
|   FIX    |   C4   |   1    |
|  FLOAT   |   C0   |   1    |
|   HIO    |   F4   |   1    |
|  NORM    |   C8   |   1    |
|   SIO    |   F0   |   1    |
|   TIO    |   F8   |   1    |
+----------+--------+--------+
```

---

## Appendix C: Example Assembly

```
Input:
        COPY    START   1000
        FIRST   STL     RETADR
                LDB     #LENGTH
                BASE    LENGTH
        CLOOP  +JSUB    RDREC
                LDA     LENGTH
                COMP    #0
                JEQ     ENDFIL
               +JSUB    WRREC
                J       CLOOP
        ENDFIL  LDA     EOF
                STA     BUFFER
                LDA     #3
                STA     LENGTH
               +JSUB    WRREC
                J       @RETADR
        EOF     BYTE    C'EOF'
        RETADR  RESW    1
        LENGTH  RESW    1
        BUFFER  RESB    4096
                END     FIRST
```

Expected Symbol Table after Pass 1:
```
FIRST   = 1000
CLOOP   = 1003
ENDFIL  = 1015
EOF     = 1024
RETADR  = 1027
LENGTH  = 102A
BUFFER  = 102D
```

---

*End of Pseudo-Code Documentation*
