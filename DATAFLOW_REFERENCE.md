# 🔄 SIC/XE Assembler - Complete Data Flow Reference

**This document traces exactly what happens in the codebase from the moment you type assembly code until it's loaded into memory.**

---

## Visual Overview

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERACTION                                       │
│                                                                                     │
│   [User types code] ──► [User clicks "Assemble"] ──► [User views results]          │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 1: INPUT HANDLING                                 │
│  ┌─────────────────┐    ┌─────────────────┐                                         │
│  │   Editor.tsx    │───►│    store.ts     │                                         │
│  │ handleEditorChange  │    setSourceCode()│                                         │
│  └─────────────────┘    └─────────────────┘                                         │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 2: LEXER (Tokenization)                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │    store.ts     │───►│    lexer.ts     │───►│ TokenizedLine[] │                  │
│  │   runLexer()    │    │   tokenize()    │    │                 │                  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 3: PARSER (Validation)                            │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │    store.ts     │───►│    parser.ts    │───►│ ParseResult[]   │                  │
│  │  runParser()    │    │   parseAll()    │    │                 │                  │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 4: PASS 1 (Symbol Table)                          │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │    store.ts     │───►│  sicxePass1.ts  │───►│  Pass1Result    │                  │
│  │   runPass1()    │    │  executePass1() │    │  - symbolTable  │                  │
│  └─────────────────┘    └─────────────────┘    │  - intermediate │                  │
│                                                 └─────────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 5: PASS 2 (Object Code)                           │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐                  │
│  │    store.ts     │───►│  sicxePass2.ts  │───►│  Pass2Result    │                  │
│  │   runPass2()    │    │  executePass2() │    │  - objectCodes  │                  │
│  └─────────────────┘    └─────────────────┘    │  - nixbpe flags │                  │
│                                                 └─────────────────┘                  │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 6: OBJECT PROGRAM (H/T/M/E)                       │
│  ┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐              │
│  │    store.ts     │───►│  objectProgram.ts   │───►│  ObjectProgram  │              │
│  │ generateProgram()   │ generateObjectProgram()   │  - H,T,M,E recs │              │
│  └─────────────────┘    └─────────────────────┘    └─────────────────┘              │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              STEP 7: MEMORY LOADER                                  │
│  ┌─────────────────┐    ┌─────────────────────┐    ┌─────────────────┐              │
│  │    store.ts     │───►│  memoryLoader.ts    │───►│     Memory      │              │
│  │ loadIntoMemory()│    │ loadObjectProgram() │    │  - bytes array  │              │
│  └─────────────────┘    └─────────────────────┘    │  - metadata     │              │
│                                                     └─────────────────┘              │
└───────────────────────────────┬─────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              UI UPDATES                                             │
│  Components re-render automatically via Zustand:                                    │
│  Pass1Table.tsx │ Pass2Table.tsx │ ObjectProgram.tsx │ MemoryView.tsx              │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Detailed Walkthrough

---

## STEP 1: User Types Code in Editor

### What Happens

When the user types assembly code in the Monaco editor, the `handleEditorChange` callback is triggered.

### File: `app/assembler/components/Editor.tsx`

```tsx
// Line ~143: handleEditorChange callback
const handleEditorChange = useCallback((value: string | undefined) => {
  if (value !== undefined) {
    setSourceCode(value);  // ◄── Calls store action
  }
}, [setSourceCode]);

// Line ~350: Monaco Editor component
<Editor
  value={sourceCode}
  onChange={handleEditorChange}  // ◄── Triggered on every keystroke
  language="sicxe"
  ...
/>
```

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~62: setSourceCode action
setSourceCode: (code: string) => {
  set({
    sourceCode: code,           // ◄── Update source code in state
    currentPhase: 'idle',       // ◄── Reset phase
    tokenizedLines: [],         // ◄── Clear previous results
    pass1Result: null,
    pass2Result: null,
    objectProgram: null,
    memory: null,
    errors: []
  });
},
```

### Data Transformation

```
User Input: "COPY    START   1000\nFIRST   STL     RETADR\n..."
     ↓
Store State: { sourceCode: "COPY    START   1000\nFIRST   STL     RETADR\n..." }
```

---

## STEP 2: User Clicks "Assemble" Button

### What Happens

The "Assemble" button triggers the `assemble()` function, which orchestrates all subsequent steps.

### File: `app/assembler/components/Editor.tsx`

```tsx
// Line ~270: Assemble button
<Button
  onClick={() => assemble()}  // ◄── Triggers the full assembly process
  disabled={isProcessing}
>
  <Play className="mr-2 h-4 w-4" />
  Assemble
</Button>
```

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~398: The assemble() orchestration function
assemble: () => {
  const state = get();

  // Reset errors and set initial phase
  set({ errors: [], currentPhase: 'lexing' });

  const runAsync = async () => {
    // Step 1: Run lexer
    state.runLexer();
    await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
    if (get().currentPhase === 'error') return;

    // Step 2: Run parser
    state.runParser();
    await new Promise(resolve => setTimeout(resolve, 0));
    if (parserErrors.length > 0) return;

    // Step 3: Run Pass 1
    state.runPass1();
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!get().pass1Result?.success) return;

    // Step 4: Run Pass 2
    state.runPass2();
    await new Promise(resolve => setTimeout(resolve, 0));
    if (!get().pass2Result?.success) return;

    // Step 5: Generate program
    state.generateProgram();
    await new Promise(resolve => setTimeout(resolve, 0));
    if (get().currentPhase === 'error') return;

    // Step 6: Load into memory
    state.loadIntoMemory();
  };

  runAsync();
},
```

---

## STEP 3: Lexer (Tokenization)

### What Happens

The lexer converts raw source code text into structured tokens. Each line becomes a `TokenizedLine` object.

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~72: runLexer action
runLexer: () => {
  const { sourceCode } = get();
  set({ currentPhase: 'lexing', errors: [] });

  try {
    const tokenizedLines = tokenize(sourceCode);  // ◄── Call lexer.ts
    
    set({
      tokenizedLines,          // ◄── Store result
      currentPhase: 'lexing'
    });
  } catch (error) {
    // Handle errors...
  }
},
```

### File: `app/assembler/lib/lexer.ts`

```typescript
// Line ~116: Main tokenize function
export function tokenize(sourceCode: string): TokenizedLine[] {
  const lines = sourceCode.split('\n');  // ◄── Split into lines
  return lines.map((line, index) => tokenizeLine(line, index + 1));
}

// Line ~12: tokenizeLine - processes a single line
export function tokenizeLine(rawLine: string, lineNumber: number): TokenizedLine {
  const result: TokenizedLine = {
    lineNumber,
    opcode: '',
    rawLine,
    isEmpty: false,
    isComment: false,
  };

  // Handle empty lines
  if (trimmedLine.length === 0) {
    result.isEmpty = true;
    return result;
  }

  // Handle comments (lines starting with .)
  if (trimmedLine.startsWith('.')) {
    result.isComment = true;
    result.comment = trimmedLine;
    return result;
  }

  // Split tokens and identify:
  // - label (first column, if not an opcode)
  // - opcode (instruction or directive)
  // - operand (with addressing prefixes #, @, and ,X suffix)
  
  // Check for extended format (+)
  if (opcodeToken.startsWith('+')) {
    result.isExtended = true;
    opcodeToken = opcodeToken.substring(1);
  }

  // Parse addressing mode prefixes
  if (operand.startsWith('#')) {
    result.addressingPrefix = '#';  // Immediate
  } else if (operand.startsWith('@')) {
    result.addressingPrefix = '@';  // Indirect
  }

  // Check for indexed addressing (,X)
  if (operand.toUpperCase().endsWith(',X')) {
    result.indexed = true;
  }

  return result;
}
```

### Data Transformation

```
Input: "FIRST   STL     RETADR"
     ↓
Output: TokenizedLine {
  lineNumber: 2,
  label: "FIRST",
  opcode: "STL",
  operand: "RETADR",
  rawLine: "FIRST   STL     RETADR",
  isEmpty: false,
  isComment: false,
  isExtended: false,
  indexed: false
}
```

---

## STEP 4: Parser (Syntax Validation)

### What Happens

The parser validates each tokenized line for syntax errors (invalid opcodes, missing operands, etc.).

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~117: runParser action
runParser: () => {
  const { tokenizedLines } = get();
  set({ currentPhase: 'parsing' });

  try {
    const { errors, success } = parseAll(currentLines);  // ◄── Call parser.ts
    
    set(state => ({
      errors: [...state.errors, ...errors],
      currentPhase: success ? 'parsing' : 'error'
    }));
  } catch (error) {
    // Handle errors...
  }
},
```

### File: `app/assembler/lib/parser.ts`

```typescript
// Line ~31: parseLine - validates a single line
export function parseLine(line: TokenizedLine): ParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Skip empty lines and comments
  if (line.isEmpty || line.isComment) {
    return { valid: true, line, errors, warnings };
  }

  // Validate label format
  if (line.label) {
    if (!isValidLabel(line.label)) {
      errors.push(`Invalid label format: "${line.label}"`);
    }
  }

  // Validate opcode exists
  if (!isValidOpcode(opcode) && !isDirective(opcode)) {
    errors.push(`Invalid opcode: "${opcode}"`);
  }

  // Validate extended format usage (only Format 3 can be extended)
  if (line.isExtended && !canBeExtended(opcode)) {
    errors.push(`Instruction "${opcode}" cannot use extended format`);
  }

  // Validate directive-specific rules
  // e.g., BYTE requires operand, RESB requires positive integer, etc.
  
  return { valid: errors.length === 0, line, errors, warnings };
}

// parseAll runs parseLine on all tokenized lines
export function parseAll(lines: TokenizedLine[]): { errors: AssemblerError[]; success: boolean } {
  // ... validates all lines
}
```

### Data Transformation

```
Input: TokenizedLine { opcode: "INVALID_OP", ... }
     ↓
Output: ParseResult {
  valid: false,
  errors: ["Invalid opcode: \"INVALID_OP\""]
}
```

---

## STEP 5: Pass 1 (Symbol Table & Address Assignment)

### What Happens

Pass 1 builds the **Symbol Table** (SYMTAB) and assigns addresses using the **Location Counter** (LOCCTR).

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~176: runPass1 action
runPass1: () => {
  let { tokenizedLines } = get();
  set({ currentPhase: 'pass1' });

  try {
    const pass1Result = executePass1(tokenizedLines);  // ◄── Call sicxePass1.ts
    
    set(state => ({
      pass1Result,              // ◄── Store result
      errors: [...state.errors, ...pass1Result.errors],
      currentPhase: pass1Result.success ? 'pass1' : 'error'
    }));
  } catch (error) {
    // Handle errors...
  }
},
```

### File: `app/assembler/lib/sicxePass1.ts`

```typescript
// Line ~165: Main executePass1 function
export function executePass1(lines: TokenizedLine[]): Pass1Result {
  const symbolTable: SymbolTable = {};
  const intermediateFile: IntermediateEntry[] = [];
  const errors: AssemblerError[] = [];
  
  let locctr = 0;
  let startAddress = 0;
  let programName = 'PROG';

  for (const line of lines) {
    // Skip empty lines and comments
    if (line.isEmpty || line.isComment) {
      intermediateFile.push({ line, locctr: null, size: 0 });
      continue;
    }

    const opcode = line.opcode.toUpperCase();

    // Handle START directive
    if (opcode === 'START') {
      startAddress = parseNumericOperand(line.operand || '0') || 0;
      locctr = startAddress;
      programName = line.label || 'PROG';
      symbolTable[line.label.toUpperCase()] = locctr;  // ◄── Add to SYMTAB
      continue;
    }

    // Handle END directive
    if (opcode === 'END') {
      intermediateFile.push({ line, locctr, size: 0 });
      break;
    }

    // Save current location
    const currentLocctr = locctr;

    // Add label to symbol table (if present)
    if (line.label) {
      const label = line.label.toUpperCase();
      if (label in symbolTable) {
        errors.push(createError(line, `Duplicate symbol: "${label}"`, locctr));
      } else {
        symbolTable[label] = locctr;  // ◄── KEY: Label → Address mapping
      }
    }

    // Calculate instruction size
    const size = calculateInstructionSize(line, errors);
    // Size depends on:
    // - Format 1: 1 byte
    // - Format 2: 2 bytes
    // - Format 3: 3 bytes
    // - Format 4 (+): 4 bytes
    // - BYTE: depends on constant (C'ABC' = 3, X'0F' = 1)
    // - WORD: 3 bytes
    // - RESB n: n bytes
    // - RESW n: n * 3 bytes

    // Add to intermediate file
    intermediateFile.push({
      line: { ...line, location: currentLocctr },
      locctr: currentLocctr,
      size: size,
      symbolTableSnapshot: { ...symbolTable }
    });

    // Increment location counter
    locctr += size;
  }

  const programLength = locctr - startAddress;

  return {
    intermediateFile,
    symbolTable,         // ◄── SYMTAB: {"FIRST": 0x1000, "CLOOP": 0x1003, ...}
    programName,
    startAddress,
    programLength,
    errors,
    success: !errors.some(e => e.type === 'error')
  };
}
```

### Data Transformation

```
Input: TokenizedLine[] (all source lines)
     ↓
Output: Pass1Result {
  symbolTable: {
    "COPY": 0x1000,
    "FIRST": 0x1000,
    "CLOOP": 0x1006,
    "RETADR": 0x102A,
    "LENGTH": 0x102D,
    "BUFFER": 0x1030
  },
  intermediateFile: [
    { line: {..., location: 0x1000}, locctr: 0x1000, size: 0 },
    { line: {..., location: 0x1000}, locctr: 0x1000, size: 3 },
    ...
  ],
  programName: "COPY",
  startAddress: 0x1000,
  programLength: 0x107A
}
```

---

## STEP 6: Pass 2 (Object Code Generation)

### What Happens

Pass 2 generates the actual **object code** for each instruction using the symbol table from Pass 1.

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~232: runPass2 action
runPass2: () => {
  let { pass1Result } = get();
  set({ currentPhase: 'pass2' });

  try {
    const pass2Result = executePass2(pass1Result);  // ◄── Call sicxePass2.ts
    
    set(state => ({
      pass2Result,                 // ◄── Store result
      errors: [...state.errors, ...pass2Result.errors],
      currentPhase: pass2Result.success ? 'pass2' : 'error'
    }));
  } catch (error) {
    // Handle errors...
  }
},
```

### File: `app/assembler/lib/sicxePass2.ts`

```typescript
// Line ~53: Main executePass2 function
export function executePass2(pass1Result: Pass1Result): Pass2Result {
  const { intermediateFile, symbolTable } = pass1Result;
  const entries: Pass2Entry[] = [];
  const errors: AssemblerError[] = [];
  let baseRegister: number | null = null;

  for (const entry of intermediateFile) {
    const line = entry.line;
    const opcode = line.opcode.toUpperCase();

    // Handle directives
    if (isDirective(opcode)) {
      // BASE: Set base register for BASE-relative addressing
      if (opcode === 'BASE' && line.operand) {
        baseRegister = symbolTable[line.operand.toUpperCase()];
      }
      // NOBASE: Clear base register
      if (opcode === 'NOBASE') {
        baseRegister = null;
      }
      // BYTE: Generate hex from constant
      // WORD: Generate 3-byte value
      // RESB/RESW: No object code (just reserved space)
      continue;
    }

    // Handle instructions
    const result = generateInstructionCode(line, entry, symbolTable, baseRegister);
    entries.push(result.entry);
  }

  return { entries, errors, success: !errors.some(e => e.type === 'error') };
}

// Line ~302: Generate object code for an instruction
function generateInstructionCode(line, entry, symbolTable, baseRegister) {
  const isExtended = line.isExtended;
  const format = isExtended ? 4 : opcodeEntry.format;

  switch (format) {
    case 1: return generateFormat1(line, opcodeEntry);
    case 2: return generateFormat2(line, opcodeEntry);
    case 3: return generateFormat3(line, opcodeEntry, entry, symbolTable, baseRegister);
    case 4: return generateFormat4(line, opcodeEntry, entry, symbolTable);
  }
}

// Line ~433: Generate Format 3 (most common)
function generateFormat3(line, opcodeEntry, entry, symbolTable, baseRegister) {
  // 1. Determine addressing mode (n, i, x flags)
  const { n, i, x, addressingMode, targetAddress } = resolveAddressing(line, symbolTable);

  // 2. Calculate displacement (PC-relative or BASE-relative)
  const pc = entry.locctr + 3;  // PC points to NEXT instruction
  const dispResult = calculateDisplacement(targetAddress, pc, baseRegister);
  
  const nixbpe = {
    n, i, x,
    b: dispResult.b,   // BASE-relative flag
    p: dispResult.p,   // PC-relative flag
    e: 0               // Not extended
  };

  // 3. Build object code
  const objectCode = buildFormat3ObjectCode(opcodeEntry.opcode, nixbpe, dispResult.displacement);

  return { entry: { line, format: 3, nixbpe, objectCode, ... } };
}

// Line ~777: Calculate displacement
function calculateDisplacement(targetAddress, pc, baseRegister) {
  // Try PC-relative first
  const pcDisp = targetAddress - pc;
  if (pcDisp >= -2048 && pcDisp <= 2047) {
    return { displacement: pcDisp, b: 0, p: 1, mode: 'PC-relative' };
  }

  // Try BASE-relative
  if (baseRegister !== null) {
    const baseDisp = targetAddress - baseRegister;
    if (baseDisp >= 0 && baseDisp <= 4095) {
      return { displacement: baseDisp, b: 1, p: 0, mode: 'BASE-relative' };
    }
  }

  // Neither works - error (need Format 4)
  return { error: "Displacement out of range, use +" };
}

// Line ~811: Build Format 3 object code bytes
function buildFormat3ObjectCode(opcode, nixbpe, displacement) {
  // Byte 1: [opcode(6 bits)][n][i]
  const byte1 = (opcode & 0xFC) | (nixbpe.n << 1) | nixbpe.i;

  // Byte 2: [x][b][p][e][disp high 4 bits]
  const byte2 = (nixbpe.x << 7) | (nixbpe.b << 6) | 
                (nixbpe.p << 5) | (nixbpe.e << 4) | 
                ((displacement >> 8) & 0x0F);

  // Byte 3: [disp low 8 bits]
  const byte3 = displacement & 0xFF;

  return byte1.toString(16) + byte2.toString(16) + byte3.toString(16);
}
```

### Data Transformation

```
Input: IntermediateEntry { line: { opcode: "LDA", operand: "BUFFER" }, locctr: 0x1003 }
       symbolTable: { "BUFFER": 0x1030 }
     ↓
Calculation:
  - Target Address = SYMTAB["BUFFER"] = 0x1030
  - PC = 0x1003 + 3 = 0x1006
  - Displacement = 0x1030 - 0x1006 = 0x002A (PC-relative works!)
  - LDA opcode = 0x00
  - n=1, i=1, x=0, b=0, p=1, e=0
     ↓
Output: Pass2Entry {
  line: {...},
  format: 3,
  nixbpe: { n: 1, i: 1, x: 0, b: 0, p: 1, e: 0 },
  objectCode: "03202A",  // ◄── The hex machine code!
  displacement: 0x002A,
  displacementMode: "PC-relative"
}
```

---

## STEP 7: Object Program Generation (H/T/M/E Records)

### What Happens

The object program generator takes Pass 2 output and creates the standard object file format with Header, Text, Modification, and End records.

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~290: generateProgram action
generateProgram: () => {
  const { pass1Result, pass2Result } = get();
  set({ currentPhase: 'generating' });

  try {
    const objectProgram = generateObjectProgram(pass1Result, pass2Result);  // ◄── Call objectProgram.ts
    
    set({
      objectProgram,           // ◄── Store result
      currentPhase: 'generating'
    });
  } catch (error) {
    // Handle errors...
  }
},
```

### File: `app/assembler/lib/objectProgram.ts`

```typescript
// Line ~18: Main generateObjectProgram function
export function generateObjectProgram(
  pass1Result: Pass1Result,
  pass2Result: Pass2Result
): ObjectProgram {
  const { programName, startAddress, programLength } = pass1Result;

  // Generate Header record
  const header = generateHeaderRecord(programName, startAddress, programLength);
  // Format: H^COPY  ^001000^00107A

  // Generate Text records (max 30 bytes each)
  const textRecords = generateTextRecords(pass2Result);
  // Format: T^001000^1E^17202D69202D4B...

  // Generate Modification records (for relocatable Format 4 addresses)
  const modificationRecords = generateModificationRecords(pass2Result, programName);
  // Format: M^001007^05^+COPY

  // Generate End record
  const firstExecAddress = findFirstExecutableAddress(pass1Result, pass2Result);
  const endRecord = generateEndRecord(firstExecAddress);
  // Format: E^001000

  return {
    programName,
    startAddress,
    programLength,
    header,
    textRecords,
    modificationRecords,
    endRecord,
    rawRecords: [header.raw, ...textRecords.map(t => t.raw), ...modRecords.map(m => m.raw), endRecord.raw]
  };
}

// Line ~54: Generate Header Record
function generateHeaderRecord(programName, startAddress, programLength): HeaderRecord {
  const name = programName.substring(0, 6).padEnd(6, ' ');
  const start = startAddress.toString(16).toUpperCase().padStart(6, '0');
  const length = programLength.toString(16).toUpperCase().padStart(6, '0');
  
  const raw = `H^${name}^${start}^${length}`;
  // Example: H^COPY  ^001000^00107A
  
  return { type: 'H', programName: name, startAddress, programLength, raw };
}

// Line ~75: Generate Text Records
function generateTextRecords(pass2Result): TextRecord[] {
  const records: TextRecord[] = [];
  let currentStart: number | null = null;
  let currentBytes: string[] = [];
  let currentByteCount = 0;

  for (const entry of pass2Result.entries) {
    if (!entry.objectCode) continue;  // Skip entries without object code (RESB, etc.)

    const objectCodeBytes = entry.objectCode.length / 2;

    // Start new record if:
    // 1. No current record, OR
    // 2. Current record would exceed 30 bytes
    if (currentStart === null) {
      currentStart = entry.line.location;
      currentBytes = [entry.objectCode];
      currentByteCount = objectCodeBytes;
    } else if (currentByteCount + objectCodeBytes > 30) {
      // Finalize current record and start new
      records.push(finalizeTextRecord(currentStart, currentBytes, currentByteCount));
      currentStart = entry.line.location;
      currentBytes = [entry.objectCode];
      currentByteCount = objectCodeBytes;
    } else {
      currentBytes.push(entry.objectCode);
      currentByteCount += objectCodeBytes;
    }
  }

  // Finalize last record
  if (currentBytes.length > 0) {
    records.push(finalizeTextRecord(currentStart, currentBytes, currentByteCount));
  }

  return records;
}

// Line ~155: Generate Modification Records
function generateModificationRecords(pass2Result, programName): ModificationRecord[] {
  const records: ModificationRecord[] = [];

  for (const entry of pass2Result.entries) {
    if (entry.needsModification && entry.format === 4) {
      // Format 4 with relocatable address needs modification
      const modAddress = entry.line.location + 1;  // Skip opcode byte
      const length = 5;  // 5 half-bytes = 20 bits

      const raw = `M^${modAddress.toString(16).padStart(6, '0')}^05^+${programName}`;
      records.push({ type: 'M', address: modAddress, length, symbol: programName, raw });
    }
  }

  return records;
}
```

### Data Transformation

```
Input: Pass1Result + Pass2Result
     ↓
Output: ObjectProgram {
  header: { raw: "H^COPY  ^001000^00107A", ... },
  textRecords: [
    { raw: "T^001000^1E^17202D69202D4B101036...", ... },
    { raw: "T^00101E^15^0F20164800170F200D...", ... }
  ],
  modificationRecords: [
    { raw: "M^001007^05^+COPY", ... },
    { raw: "M^001014^05^+COPY", ... }
  ],
  endRecord: { raw: "E^001000", ... },
  rawRecords: [
    "H^COPY  ^001000^00107A",
    "T^001000^1E^17202D69202D4B101036...",
    "T^00101E^15^0F20164800170F200D...",
    "M^001007^05^+COPY",
    "M^001014^05^+COPY",
    "E^001000"
  ]
}
```

---

## STEP 8: Memory Loader

### What Happens

The memory loader takes the object program and loads it into a simulated memory array (like a real loader would do).

### File: `app/assembler/lib/store.ts`

```typescript
// Line ~356: loadIntoMemory action
loadIntoMemory: () => {
  const { objectProgram, pass2Result } = get();
  set({ currentPhase: 'loading' });

  try {
    const memory = loadObjectProgram(objectProgram, pass2Result, SIC_MEMORY_SIZE);  // ◄── Call memoryLoader.ts
    
    set({
      memory,                    // ◄── Store result
      currentPhase: 'complete'   // ◄── DONE!
    });
  } catch (error) {
    // Handle errors...
  }
},
```

### File: `app/assembler/lib/memoryLoader.ts`

```typescript
// Line ~35: Main loadObjectProgram function
export function loadObjectProgram(
  objectProgram: ObjectProgram,
  pass2Result?: Pass2Result,
  memorySize: number = MEMORY_SIZE
): Memory {
  // Create empty memory (Uint8Array)
  const memory = createEmptyMemory(memorySize);  // 32KB or 1MB

  // Set program boundaries
  memory.programStart = objectProgram.startAddress;
  memory.programEnd = objectProgram.startAddress + objectProgram.programLength;

  // Build address-to-source mapping for visualization
  const addressToLine = new Map();
  if (pass2Result) {
    for (const entry of pass2Result.entries) {
      if (entry.line.location !== undefined && entry.objectCode) {
        addressToLine.set(entry.line.location, {
          lineNumber: entry.line.lineNumber,
          instruction: `${entry.line.opcode} ${entry.line.operand || ''}`,
          label: entry.line.label
        });
      }
    }
  }

  // Load Text records into memory
  for (const textRecord of objectProgram.textRecords) {
    const startAddr = textRecord.startAddress;
    const bytes = hexStringToBytes(textRecord.objectCode);  // Convert hex to bytes

    for (let i = 0; i < bytes.length; i++) {
      const address = startAddr + i;
      memory.bytes[address] = bytes[i];  // ◄── Write byte to memory array

      // Store metadata for visualization
      memory.metadata.set(address, {
        address,
        value: bytes[i],
        type: 'code',
        sourceLineNumber: sourceInfo?.lineNumber,
        instruction: sourceInfo?.instruction
      });
    }
  }

  // Mark modified addresses (for visualization)
  for (const modRecord of objectProgram.modificationRecords) {
    // Mark bytes that would be modified during relocation
    for (let i = 0; i < Math.ceil(modRecord.length / 2); i++) {
      const existing = memory.metadata.get(modRecord.address + i);
      if (existing) {
        memory.metadata.set(modRecord.address + i, { ...existing, type: 'modified' });
      }
    }
  }

  return memory;
}

// Line ~21: Create empty memory structure
export function createEmptyMemory(size: number): Memory {
  return {
    bytes: new Uint8Array(size),  // ◄── Raw byte array (like real memory)
    programStart: 0,
    programEnd: 0,
    metadata: new Map()           // ◄── For UI visualization
  };
}
```

### Data Transformation

```
Input: ObjectProgram with text records
     ↓
Processing:
  Text Record: T^001000^1E^17202D69202D4B...
  
  Address 0x1000: byte 0x17
  Address 0x1001: byte 0x20
  Address 0x1002: byte 0x2D
  ... and so on
     ↓
Output: Memory {
  bytes: Uint8Array [
    0, 0, 0, ...,           // Addresses 0x0000 - 0x0FFF (empty)
    0x17, 0x20, 0x2D, ...,  // Addresses 0x1000+ (program)
    0, 0, 0, ...            // After program (empty)
  ],
  programStart: 0x1000,
  programEnd: 0x107A,
  metadata: Map {
    0x1000 → { value: 0x17, type: 'code', sourceLineNumber: 2, instruction: "STL RETADR" },
    0x1001 → { value: 0x20, type: 'code', ... },
    ...
  }
}
```

---

## STEP 9: UI Updates (Automatic)

### What Happens

When the store state changes, all React components that use `useAssemblerStore()` automatically re-render with the new data.

### How Zustand Triggers Re-renders

```tsx
// Any component using the store:
function Pass1Table() {
  // This hook subscribes to store changes
  const { pass1Result } = useAssemblerStore();
  
  // When pass1Result changes, this component re-renders
  if (!pass1Result) return <div>Run Pass 1...</div>;
  
  return <Table>{/* Display pass1Result data */}</Table>;
}
```

### Component → State Mapping

| Component | State Used | File Location |
|-----------|------------|---------------|
| `Editor.tsx` | `sourceCode`, `errors` | `components/Editor.tsx` |
| `Pass1Table.tsx` | `pass1Result`, `selectedLineNumber` | `components/Pass1Table.tsx` |
| `Pass2Table.tsx` | `pass2Result`, `selectedLineNumber` | `components/Pass2Table.tsx` |
| `ObjectProgram.tsx` | `objectProgram` | `components/ObjectProgram.tsx` |
| `MemoryView.tsx` | `memory`, `selectedMemoryAddress` | `components/MemoryView.tsx` |
| `InstructionBreakdown.tsx` | `pass2Result`, `selectedLineNumber` | `components/InstructionBreakdown.tsx` |
| `ErrorPanel.tsx` | `errors` | `components/ErrorPanel.tsx` |

---

## Complete Function Call Chain

```
User clicks "Assemble" button
│
└─► Editor.tsx: onClick={() => assemble()}
    │
    └─► store.ts: assemble()
        │
        ├─► store.ts: runLexer()
        │   └─► lexer.ts: tokenize(sourceCode)
        │       └─► lexer.ts: tokenizeLine(line, lineNumber) [for each line]
        │
        ├─► store.ts: runParser()
        │   └─► parser.ts: parseAll(tokenizedLines)
        │       └─► parser.ts: parseLine(line) [for each line]
        │
        ├─► store.ts: runPass1()
        │   └─► sicxePass1.ts: executePass1(tokenizedLines)
        │       ├─► sicxePass1.ts: calculateInstructionSize(line)
        │       └─► sicxePass1.ts: calculateDirectiveSize(directive, operand)
        │
        ├─► store.ts: runPass2()
        │   └─► sicxePass2.ts: executePass2(pass1Result)
        │       ├─► sicxePass2.ts: generateInstructionCode(line, entry, symtab, base)
        │       │   ├─► generateFormat1(line, opcodeEntry)
        │       │   ├─► generateFormat2(line, opcodeEntry)
        │       │   ├─► generateFormat3(line, opcodeEntry, entry, symtab, base)
        │       │   │   ├─► resolveAddressing(line, symtab)
        │       │   │   ├─► calculateDisplacement(target, pc, base)
        │       │   │   └─► buildFormat3ObjectCode(opcode, nixbpe, disp)
        │       │   └─► generateFormat4(line, opcodeEntry, entry, symtab)
        │       │       └─► buildFormat4ObjectCode(opcode, nixbpe, address)
        │       └─► handleDirective(directive, line, entry, symtab)
        │
        ├─► store.ts: generateProgram()
        │   └─► objectProgram.ts: generateObjectProgram(pass1Result, pass2Result)
        │       ├─► generateHeaderRecord(name, start, length)
        │       ├─► generateTextRecords(pass2Result)
        │       ├─► generateModificationRecords(pass2Result, name)
        │       └─► generateEndRecord(firstExecAddress)
        │
        └─► store.ts: loadIntoMemory()
            └─► memoryLoader.ts: loadObjectProgram(objProgram, pass2Result, size)
                ├─► createEmptyMemory(size)
                └─► hexStringToBytes(objectCode) [for each text record]
```

---

## Summary: File Responsibilities

| File | Responsibility | Key Functions |
|------|----------------|---------------|
| `Editor.tsx` | UI input, button handling | `handleEditorChange`, `assemble()` |
| `store.ts` | State management, orchestration | `setSourceCode`, `runLexer`, `runPass1`, `runPass2`, `generateProgram`, `loadIntoMemory`, `assemble` |
| `lexer.ts` | Tokenize source code | `tokenize()`, `tokenizeLine()` |
| `parser.ts` | Validate syntax | `parseAll()`, `parseLine()` |
| `sicxePass1.ts` | Build symbol table, assign addresses | `executePass1()`, `calculateInstructionSize()` |
| `sicxePass2.ts` | Generate object code | `executePass2()`, `generateFormat3()`, `calculateDisplacement()` |
| `objectProgram.ts` | Create H/T/M/E records | `generateObjectProgram()`, `generateTextRecords()` |
| `memoryLoader.ts` | Load into memory array | `loadObjectProgram()`, `createEmptyMemory()` |
| `optab.ts` | Opcode definitions | `OPTAB`, `getOpcodeEntry()`, `isValidOpcode()` |
| `types.ts` | TypeScript interfaces | All type definitions |

---

## 📌 Complete Worked Example: Data State at Each Step

This section traces the **exact data** at each step of the assembly process using a simple program.

### The Example Program

```assembly
SIMPLE  START   0
        LDA     FIVE
        ADD     THREE
        STA     RESULT
        RSUB
FIVE    WORD    5
THREE   WORD    3
RESULT  RESW    1
        END     SIMPLE
```

This program:
1. Loads the value 5 into register A
2. Adds 3 to it (A = 8)
3. Stores the result
4. Returns

---

### INITIAL STATE (Before Assembly)

```javascript
// store.ts initial state
{
  sourceCode: "SIMPLE  START   0\n        LDA     FIVE\n        ADD     THREE\n        STA     RESULT\n        RSUB\nFIVE    WORD    5\nTHREE   WORD    3\nRESULT  RESW    1\n        END     SIMPLE",
  currentPhase: "idle",
  tokenizedLines: [],
  pass1Result: null,
  pass2Result: null,
  objectProgram: null,
  memory: null,
  errors: [],
  selectedLineNumber: null,
  selectedMemoryAddress: null
}
```

---

### STEP 1: After Lexer (`tokenize()`)

**Function called**: `lexer.ts → tokenize(sourceCode)`

```javascript
// tokenizedLines array (stored in store.ts)
[
  {
    lineNumber: 1,
    label: "SIMPLE",
    opcode: "START",
    operand: "0",
    rawLine: "SIMPLE  START   0",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 2,
    label: undefined,
    opcode: "LDA",
    operand: "FIVE",
    rawLine: "        LDA     FIVE",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 3,
    label: undefined,
    opcode: "ADD",
    operand: "THREE",
    rawLine: "        ADD     THREE",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 4,
    label: undefined,
    opcode: "STA",
    operand: "RESULT",
    rawLine: "        STA     RESULT",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 5,
    label: undefined,
    opcode: "RSUB",
    operand: undefined,
    rawLine: "        RSUB",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 6,
    label: "FIVE",
    opcode: "WORD",
    operand: "5",
    rawLine: "FIVE    WORD    5",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 7,
    label: "THREE",
    opcode: "WORD",
    operand: "3",
    rawLine: "THREE   WORD    3",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 8,
    label: "RESULT",
    opcode: "RESW",
    operand: "1",
    rawLine: "RESULT  RESW    1",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  },
  {
    lineNumber: 9,
    label: undefined,
    opcode: "END",
    operand: "SIMPLE",
    rawLine: "        END     SIMPLE",
    isEmpty: false,
    isComment: false,
    isExtended: false,
    indexed: false,
    addressingPrefix: undefined
  }
]
```

**State after lexer**:
```javascript
{
  currentPhase: "lexing",
  tokenizedLines: [/* 9 TokenizedLine objects above */],
  // ... rest unchanged
}
```

---

### STEP 2: After Parser (`parseAll()`)

**Function called**: `parser.ts → parseAll(tokenizedLines)`

```javascript
// Parser validates each line and returns:
{
  errors: [],  // No errors - all lines are valid
  success: true
}

// Each line passes validation:
// Line 1: START with valid hex operand ✓
// Line 2: LDA is valid opcode, FIVE is valid operand ✓
// Line 3: ADD is valid opcode, THREE is valid operand ✓
// Line 4: STA is valid opcode, RESULT is valid operand ✓
// Line 5: RSUB is valid opcode with no operand (correct) ✓
// Line 6: WORD with valid numeric operand ✓
// Line 7: WORD with valid numeric operand ✓
// Line 8: RESW with valid positive integer ✓
// Line 9: END with optional operand ✓
```

**State after parser**:
```javascript
{
  currentPhase: "parsing",
  errors: [],  // No syntax errors
  // ... rest unchanged
}
```

---

### STEP 3: After Pass 1 (`executePass1()`)

**Function called**: `sicxePass1.ts → executePass1(tokenizedLines)`

#### Symbol Table Built:

| Symbol | Address (Hex) | Address (Decimal) |
|--------|---------------|-------------------|
| SIMPLE | 0000 | 0 |
| FIVE | 000C | 12 |
| THREE | 000F | 15 |
| RESULT | 0012 | 18 |

#### LOCCTR Trace:

| Line | Label | Opcode | Operand | LOCCTR | Size | LOCCTR After |
|------|-------|--------|---------|--------|------|--------------|
| 1 | SIMPLE | START | 0 | 0000 | 0 | 0000 |
| 2 | - | LDA | FIVE | 0000 | 3 | 0003 |
| 3 | - | ADD | THREE | 0003 | 3 | 0006 |
| 4 | - | STA | RESULT | 0006 | 3 | 0009 |
| 5 | - | RSUB | - | 0009 | 3 | 000C |
| 6 | FIVE | WORD | 5 | 000C | 3 | 000F |
| 7 | THREE | WORD | 3 | 000F | 3 | 0012 |
| 8 | RESULT | RESW | 1 | 0012 | 3 | 0015 |
| 9 | - | END | SIMPLE | 0015 | 0 | 0015 |

```javascript
// pass1Result object (stored in store.ts)
{
  programName: "SIMPLE",
  startAddress: 0,        // 0x0000
  programLength: 21,      // 0x0015 (21 bytes)
  
  symbolTable: {
    "SIMPLE": 0,   // 0x0000
    "FIVE": 12,    // 0x000C
    "THREE": 15,   // 0x000F
    "RESULT": 18   // 0x0012
  },
  
  intermediateFile: [
    {
      line: { lineNumber: 1, label: "SIMPLE", opcode: "START", operand: "0", location: 0 },
      locctr: 0,
      size: 0,
      symbolTableSnapshot: { "SIMPLE": 0 }
    },
    {
      line: { lineNumber: 2, opcode: "LDA", operand: "FIVE", location: 0 },
      locctr: 0,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0 }
    },
    {
      line: { lineNumber: 3, opcode: "ADD", operand: "THREE", location: 3 },
      locctr: 3,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0 }
    },
    {
      line: { lineNumber: 4, opcode: "STA", operand: "RESULT", location: 6 },
      locctr: 6,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0 }
    },
    {
      line: { lineNumber: 5, opcode: "RSUB", location: 9 },
      locctr: 9,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0 }
    },
    {
      line: { lineNumber: 6, label: "FIVE", opcode: "WORD", operand: "5", location: 12 },
      locctr: 12,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0, "FIVE": 12 }
    },
    {
      line: { lineNumber: 7, label: "THREE", opcode: "WORD", operand: "3", location: 15 },
      locctr: 15,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0, "FIVE": 12, "THREE": 15 }
    },
    {
      line: { lineNumber: 8, label: "RESULT", opcode: "RESW", operand: "1", location: 18 },
      locctr: 18,
      size: 3,
      symbolTableSnapshot: { "SIMPLE": 0, "FIVE": 12, "THREE": 15, "RESULT": 18 }
    },
    {
      line: { lineNumber: 9, opcode: "END", operand: "SIMPLE", location: 21 },
      locctr: 21,
      size: 0,
      symbolTableSnapshot: { "SIMPLE": 0, "FIVE": 12, "THREE": 15, "RESULT": 18 }
    }
  ],
  
  errors: [],
  success: true
}
```

**State after Pass 1**:
```javascript
{
  currentPhase: "pass1",
  pass1Result: { /* object above */ },
  // ... rest unchanged
}
```

---

### STEP 4: After Pass 2 (`executePass2()`)

**Function called**: `sicxePass2.ts → executePass2(pass1Result)`

#### Object Code Calculation for Each Instruction:

**Line 2: LDA FIVE**
```
Opcode: LDA = 0x00
Format: 3
Target Address: FIVE = 0x000C
Current LOCCTR: 0x0000
PC (next instruction): 0x0000 + 3 = 0x0003
Displacement: 0x000C - 0x0003 = 0x0009 (PC-relative, within range)

Addressing: Simple (n=1, i=1)
Flags: n=1, i=1, x=0, b=0, p=1, e=0

Object Code Construction:
  Byte 1: (0x00 & 0xFC) | (1 << 1) | 1 = 0x03
  Byte 2: (0 << 7) | (0 << 6) | (1 << 5) | (0 << 4) | (0x09 >> 8) = 0x20
  Byte 3: 0x09 & 0xFF = 0x09

Object Code: 032009
```

**Line 3: ADD THREE**
```
Opcode: ADD = 0x18
Format: 3
Target Address: THREE = 0x000F
Current LOCCTR: 0x0003
PC: 0x0003 + 3 = 0x0006
Displacement: 0x000F - 0x0006 = 0x0009 (PC-relative)

Flags: n=1, i=1, x=0, b=0, p=1, e=0

Object Code Construction:
  Byte 1: (0x18 & 0xFC) | (1 << 1) | 1 = 0x1B
  Byte 2: (0 << 7) | (0 << 6) | (1 << 5) | (0 << 4) | 0 = 0x20
  Byte 3: 0x09

Object Code: 1B2009
```

**Line 4: STA RESULT**
```
Opcode: STA = 0x0C
Format: 3
Target Address: RESULT = 0x0012
Current LOCCTR: 0x0006
PC: 0x0006 + 3 = 0x0009
Displacement: 0x0012 - 0x0009 = 0x0009 (PC-relative)

Flags: n=1, i=1, x=0, b=0, p=1, e=0

Object Code Construction:
  Byte 1: (0x0C & 0xFC) | (1 << 1) | 1 = 0x0F
  Byte 2: 0x20
  Byte 3: 0x09

Object Code: 0F2009
```

**Line 5: RSUB**
```
Opcode: RSUB = 0x4C
Format: 3
No operand - target address = 0, displacement = 0

Flags: n=1, i=1, x=0, b=0, p=0, e=0

Object Code Construction:
  Byte 1: (0x4C & 0xFC) | (1 << 1) | 1 = 0x4F
  Byte 2: 0x00
  Byte 3: 0x00

Object Code: 4F0000
```

**Line 6: WORD 5**
```
Directive: WORD - generates 3-byte integer constant
Value: 5 = 0x000005

Object Code: 000005
```

**Line 7: WORD 3**
```
Directive: WORD - generates 3-byte integer constant
Value: 3 = 0x000003

Object Code: 000003
```

**Line 8: RESW 1**
```
Directive: RESW - reserves space, no object code generated
Object Code: null (gap in object program)
```

```javascript
// pass2Result object (stored in store.ts)
{
  entries: [
    {
      line: { lineNumber: 1, opcode: "START", ... },
      format: 0,
      nixbpe: null,
      objectCode: null,
      targetAddress: null,
      displacement: null,
      displacementMode: "none",
      addressingMode: null,
      needsModification: false
    },
    {
      line: { lineNumber: 2, opcode: "LDA", operand: "FIVE", location: 0 },
      format: 3,
      nixbpe: { n: 1, i: 1, x: 0, b: 0, p: 1, e: 0 },
      objectCode: "032009",
      targetAddress: 12,
      displacement: 9,
      displacementMode: "PC-relative",
      addressingMode: "simple",
      needsModification: false
    },
    {
      line: { lineNumber: 3, opcode: "ADD", operand: "THREE", location: 3 },
      format: 3,
      nixbpe: { n: 1, i: 1, x: 0, b: 0, p: 1, e: 0 },
      objectCode: "1B2009",
      targetAddress: 15,
      displacement: 9,
      displacementMode: "PC-relative",
      addressingMode: "simple",
      needsModification: false
    },
    {
      line: { lineNumber: 4, opcode: "STA", operand: "RESULT", location: 6 },
      format: 3,
      nixbpe: { n: 1, i: 1, x: 0, b: 0, p: 1, e: 0 },
      objectCode: "0F2009",
      targetAddress: 18,
      displacement: 9,
      displacementMode: "PC-relative",
      addressingMode: "simple",
      needsModification: false
    },
    {
      line: { lineNumber: 5, opcode: "RSUB", location: 9 },
      format: 3,
      nixbpe: { n: 1, i: 1, x: 0, b: 0, p: 0, e: 0 },
      objectCode: "4F0000",
      targetAddress: 0,
      displacement: 0,
      displacementMode: "none",
      addressingMode: "simple",
      needsModification: false
    },
    {
      line: { lineNumber: 6, opcode: "WORD", operand: "5", location: 12 },
      format: 0,
      nixbpe: null,
      objectCode: "000005",
      targetAddress: null,
      displacement: null,
      displacementMode: "none",
      addressingMode: null,
      needsModification: false
    },
    {
      line: { lineNumber: 7, opcode: "WORD", operand: "3", location: 15 },
      format: 0,
      nixbpe: null,
      objectCode: "000003",
      targetAddress: null,
      displacement: null,
      displacementMode: "none",
      addressingMode: null,
      needsModification: false
    },
    {
      line: { lineNumber: 8, opcode: "RESW", operand: "1", location: 18 },
      format: 0,
      nixbpe: null,
      objectCode: null,  // ◄── No object code for reserved space!
      targetAddress: null,
      displacement: null,
      displacementMode: "none",
      addressingMode: null,
      needsModification: false
    },
    {
      line: { lineNumber: 9, opcode: "END", operand: "SIMPLE", location: 21 },
      format: 0,
      nixbpe: null,
      objectCode: null,
      targetAddress: null,
      displacement: null,
      displacementMode: "none",
      addressingMode: null,
      needsModification: false
    }
  ],
  errors: [],
  success: true,
  baseRegister: null
}
```

**State after Pass 2**:
```javascript
{
  currentPhase: "pass2",
  pass2Result: { /* object above */ },
  // ... rest unchanged
}
```

---

### STEP 5: After Object Program Generation (`generateObjectProgram()`)

**Function called**: `objectProgram.ts → generateObjectProgram(pass1Result, pass2Result)`

#### Generated Records:

**Header Record (H)**
```
Format: H^PROGNAME^STARTADDR^LENGTH
Values:
  - Program Name: "SIMPLE" (padded to 6 chars)
  - Start Address: 0x000000
  - Program Length: 0x000015 (21 bytes)

Record: H^SIMPLE^000000^000015
```

**Text Record (T)**
```
Format: T^STARTADDR^LENGTH^OBJECTCODE

Collecting object codes:
  Address 0x0000: 032009 (LDA FIVE)
  Address 0x0003: 1B2009 (ADD THREE)
  Address 0x0006: 0F2009 (STA RESULT)
  Address 0x0009: 4F0000 (RSUB)
  Address 0x000C: 000005 (WORD 5)
  Address 0x000F: 000003 (WORD 3)
  -- GAP at 0x0012 (RESW - no object code) --

Total bytes before gap: 18 bytes (0x12)
All fit in one T record (max 30 bytes)

Record: T^000000^12^0320091B20090F20094F0000000005000003
         |       |  |
         |       |  └─ Object codes concatenated
         |       └─ 18 bytes = 0x12
         └─ Start at address 0x000000
```

**Modification Records (M)**
```
No Format 4 instructions with relocatable addresses.
Therefore: No M records needed.
```

**End Record (E)**
```
Format: E^FIRSTEXEC
First executable instruction: Address of SIMPLE = 0x000000

Record: E^000000
```

```javascript
// objectProgram object (stored in store.ts)
{
  programName: "SIMPLE",
  startAddress: 0,
  programLength: 21,
  
  header: {
    type: "H",
    programName: "SIMPLE",
    startAddress: 0,
    programLength: 21,
    raw: "H^SIMPLE^000000^000015"
  },
  
  textRecords: [
    {
      type: "T",
      startAddress: 0,
      length: 18,
      objectCode: "0320091B20090F20094F0000000005000003",
      raw: "T^000000^12^0320091B20090F20094F0000000005000003"
    }
  ],
  
  modificationRecords: [],  // No modifications needed
  
  endRecord: {
    type: "E",
    firstExecAddress: 0,
    raw: "E^000000"
  },
  
  rawRecords: [
    "H^SIMPLE^000000^000015",
    "T^000000^12^0320091B20090F20094F0000000005000003",
    "E^000000"
  ]
}
```

**The Complete Object Program**:
```
H^SIMPLE^000000^000015
T^000000^12^0320091B20090F20094F0000000005000003
E^000000
```

**State after Object Program Generation**:
```javascript
{
  currentPhase: "generating",
  objectProgram: { /* object above */ },
  // ... rest unchanged
}
```

---

### STEP 6: After Memory Loading (`loadObjectProgram()`)

**Function called**: `memoryLoader.ts → loadObjectProgram(objectProgram, pass2Result, 32768)`

#### Memory Layout:

The text record `0320091B20090F20094F0000000005000003` is parsed and loaded byte by byte:

| Address | Hex Value | Decimal | From Instruction |
|---------|-----------|---------|------------------|
| 0x0000 | 03 | 3 | LDA FIVE (byte 1) |
| 0x0001 | 20 | 32 | LDA FIVE (byte 2) |
| 0x0002 | 09 | 9 | LDA FIVE (byte 3) |
| 0x0003 | 1B | 27 | ADD THREE (byte 1) |
| 0x0004 | 20 | 32 | ADD THREE (byte 2) |
| 0x0005 | 09 | 9 | ADD THREE (byte 3) |
| 0x0006 | 0F | 15 | STA RESULT (byte 1) |
| 0x0007 | 20 | 32 | STA RESULT (byte 2) |
| 0x0008 | 09 | 9 | STA RESULT (byte 3) |
| 0x0009 | 4F | 79 | RSUB (byte 1) |
| 0x000A | 00 | 0 | RSUB (byte 2) |
| 0x000B | 00 | 0 | RSUB (byte 3) |
| 0x000C | 00 | 0 | WORD 5 (byte 1) |
| 0x000D | 00 | 0 | WORD 5 (byte 2) |
| 0x000E | 05 | 5 | WORD 5 (byte 3) |
| 0x000F | 00 | 0 | WORD 3 (byte 1) |
| 0x0010 | 00 | 0 | WORD 3 (byte 2) |
| 0x0011 | 03 | 3 | WORD 3 (byte 3) |
| 0x0012 | 00 | 0 | RESULT (reserved, empty) |
| 0x0013 | 00 | 0 | RESULT (reserved, empty) |
| 0x0014 | 00 | 0 | RESULT (reserved, empty) |

```javascript
// memory object (stored in store.ts)
{
  bytes: Uint8Array(32768) [
    0x03, 0x20, 0x09,  // Address 0-2: LDA FIVE
    0x1B, 0x20, 0x09,  // Address 3-5: ADD THREE
    0x0F, 0x20, 0x09,  // Address 6-8: STA RESULT
    0x4F, 0x00, 0x00,  // Address 9-11: RSUB
    0x00, 0x00, 0x05,  // Address 12-14: WORD 5
    0x00, 0x00, 0x03,  // Address 15-17: WORD 3
    0x00, 0x00, 0x00,  // Address 18-20: RESULT (reserved)
    0x00, 0x00, 0x00,  // Address 21+: empty
    ... // Rest of memory is zeros
  ],
  
  programStart: 0,
  programEnd: 21,
  
  metadata: Map {
    0 => { address: 0, value: 0x03, type: "code", sourceLineNumber: 2, instruction: "LDA FIVE" },
    1 => { address: 1, value: 0x20, type: "code", sourceLineNumber: 2, instruction: "LDA FIVE" },
    2 => { address: 2, value: 0x09, type: "code", sourceLineNumber: 2, instruction: "LDA FIVE" },
    3 => { address: 3, value: 0x1B, type: "code", sourceLineNumber: 3, instruction: "ADD THREE" },
    4 => { address: 4, value: 0x20, type: "code", sourceLineNumber: 3, instruction: "ADD THREE" },
    5 => { address: 5, value: 0x09, type: "code", sourceLineNumber: 3, instruction: "ADD THREE" },
    6 => { address: 6, value: 0x0F, type: "code", sourceLineNumber: 4, instruction: "STA RESULT" },
    7 => { address: 7, value: 0x20, type: "code", sourceLineNumber: 4, instruction: "STA RESULT" },
    8 => { address: 8, value: 0x09, type: "code", sourceLineNumber: 4, instruction: "STA RESULT" },
    9 => { address: 9, value: 0x4F, type: "code", sourceLineNumber: 5, instruction: "RSUB" },
    10 => { address: 10, value: 0x00, type: "code", sourceLineNumber: 5, instruction: "RSUB" },
    11 => { address: 11, value: 0x00, type: "code", sourceLineNumber: 5, instruction: "RSUB" },
    12 => { address: 12, value: 0x00, type: "code", sourceLineNumber: 6, instruction: "WORD 5", label: "FIVE" },
    13 => { address: 13, value: 0x00, type: "code", sourceLineNumber: 6, instruction: "WORD 5" },
    14 => { address: 14, value: 0x05, type: "code", sourceLineNumber: 6, instruction: "WORD 5" },
    15 => { address: 15, value: 0x00, type: "code", sourceLineNumber: 7, instruction: "WORD 3", label: "THREE" },
    16 => { address: 16, value: 0x00, type: "code", sourceLineNumber: 7, instruction: "WORD 3" },
    17 => { address: 17, value: 0x03, type: "code", sourceLineNumber: 7, instruction: "WORD 3" }
    // Note: RESW doesn't generate metadata since it has no object code
  }
}
```

**FINAL STATE (Assembly Complete)**:
```javascript
{
  sourceCode: "SIMPLE  START   0\n        LDA     FIVE\n...",
  currentPhase: "complete",  // ◄── DONE!
  
  tokenizedLines: [ /* 9 TokenizedLine objects */ ],
  
  pass1Result: {
    programName: "SIMPLE",
    startAddress: 0,
    programLength: 21,
    symbolTable: { "SIMPLE": 0, "FIVE": 12, "THREE": 15, "RESULT": 18 },
    intermediateFile: [ /* 9 IntermediateEntry objects */ ],
    errors: [],
    success: true
  },
  
  pass2Result: {
    entries: [ /* 9 Pass2Entry objects with object codes */ ],
    errors: [],
    success: true,
    baseRegister: null
  },
  
  objectProgram: {
    programName: "SIMPLE",
    header: { raw: "H^SIMPLE^000000^000015" },
    textRecords: [{ raw: "T^000000^12^0320091B20090F20094F0000000005000003" }],
    modificationRecords: [],
    endRecord: { raw: "E^000000" },
    rawRecords: [ "H^SIMPLE^000000^000015", "T^000000^12^...", "E^000000" ]
  },
  
  memory: {
    bytes: Uint8Array(32768) [ 0x03, 0x20, 0x09, 0x1B, 0x20, 0x09, ... ],
    programStart: 0,
    programEnd: 21,
    metadata: Map(18) { /* address → metadata */ }
  },
  
  errors: [],
  selectedLineNumber: null,
  selectedMemoryAddress: null
}
```

---

### Visual Memory Map

```
Address    Hex    ASCII   Instruction
─────────────────────────────────────────
0000       03     .       ┐
0001       20     (sp)    ├── LDA FIVE (032009)
0002       09     .       ┘
0003       1B     .       ┐
0004       20     (sp)    ├── ADD THREE (1B2009)
0005       09     .       ┘
0006       0F     .       ┐
0007       20     (sp)    ├── STA RESULT (0F2009)
0008       09     .       ┘
0009       4F     O       ┐
000A       00     .       ├── RSUB (4F0000)
000B       00     .       ┘
000C       00     .       ┐
000D       00     .       ├── FIVE: WORD 5 (000005)
000E       05     .       ┘
000F       00     .       ┐
0010       00     .       ├── THREE: WORD 3 (000003)
0011       03     .       ┘
0012       00     .       ┐
0013       00     .       ├── RESULT: RESW 1 (reserved)
0014       00     .       ┘
0015       00     .       ─── End of program
```

---

### Summary Table: Data at Each Step

| Step | Phase | Key Data Created | Size |
|------|-------|------------------|------|
| Initial | idle | `sourceCode` (raw text) | 135 chars |
| 1 | lexing | `tokenizedLines[]` | 9 objects |
| 2 | parsing | Validated (no new data) | - |
| 3 | pass1 | `symbolTable`, `intermediateFile[]` | 4 symbols, 9 entries |
| 4 | pass2 | `entries[]` with object codes | 9 entries |
| 5 | generating | `objectProgram` (H/T/M/E) | 3 records |
| 6 | complete | `memory` (Uint8Array) | 18 bytes loaded |

---

*This dataflow reference was created for the SIC/XE Assembler Simulator project.*
