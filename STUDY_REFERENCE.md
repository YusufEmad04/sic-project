# 📚 SIC/XE Assembler Project - Study Reference Guide

**Prepared for: Discussion with Teacher**  
**Date: December 15, 2025**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [SIC/XE Architecture Basics](#2-sicxe-architecture-basics)
3. [Two-Pass Assembler Algorithm](#3-two-pass-assembler-algorithm)
4. [Pass 1: Symbol Table & Address Assignment](#4-pass-1-symbol-table--address-assignment)
5. [Pass 2: Object Code Generation](#5-pass-2-object-code-generation)
6. [Instruction Formats (1, 2, 3, 4)](#6-instruction-formats-1-2-3-4)
7. [Addressing Modes & NIXBPE Flags](#7-addressing-modes--nixbpe-flags)
8. [Displacement Calculation (PC-Relative vs BASE-Relative)](#8-displacement-calculation-pc-relative-vs-base-relative)
9. [Object Program Records (H, T, M, E)](#9-object-program-records-h-t-m-e)
10. [Project Architecture & Components](#10-project-architecture--components)
11. [Frontend Architecture & UI](#11-frontend-architecture--ui)
12. [State Management with Zustand](#12-state-management-with-zustand)
13. [Key Algorithms in Code](#13-key-algorithms-in-code)
14. [Common Questions & Answers](#14-common-questions--answers)

---

## 1. Project Overview

### What is this project?

This is a **web-based interactive SIC/XE assembler simulator** built with:
- **Next.js** (React framework)
- **TypeScript** (type-safe JavaScript)
- **TailwindCSS + shadcn/ui** (styling)

### What does it do?

It simulates the complete workflow of a **two-pass assembler**:

```
Source Code → Lexer → Parser → Pass 1 → Pass 2 → Object Program → Memory Loader
```

### Educational Purpose

The tool helps students understand:
- How assembly code is translated to machine code
- How symbol tables work
- How addresses are calculated
- How object programs are structured

---

## 2. SIC/XE Architecture Basics

### SIC (Simplified Instructional Computer)
- **Memory**: 32,768 bytes (2^15)
- **Word size**: 24 bits (3 bytes)
- **Registers**: A, X, L, PC, SW

### SIC/XE (Extended)
- **Memory**: 1 MB (2^20 = 1,048,576 bytes)
- **Additional registers**: B, S, T, F
- **New instruction formats**: Format 1, 2, 3, 4
- **Addressing modes**: Immediate, Indirect, Simple, Indexed

### Registers

| Register | Code | Purpose |
|----------|------|---------|
| A | 0 | Accumulator (primary arithmetic) |
| X | 1 | Index register (indexed addressing) |
| L | 2 | Linkage register (return address) |
| B | 3 | Base register (base-relative addressing) [XE] |
| S | 4 | General working register [XE] |
| T | 5 | General working register [XE] |
| F | 6 | Floating-point accumulator [XE] |
| PC | 8 | Program Counter |
| SW | 9 | Status Word (condition codes) |

---

## 3. Two-Pass Assembler Algorithm

### Why Two Passes?

**The Forward Reference Problem**: When the assembler encounters a jump instruction like `J LOOP`, it might not know the address of `LOOP` yet if it's defined later in the code.

**Solution**: Use two passes:

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PASS 1                                     │
│  • Scan source code                                                 │
│  • Assign addresses to all statements (LOCCTR)                      │
│  • Build SYMBOL TABLE (label → address)                             │
│  • Generate intermediate file                                        │
│  • NO object code generated yet                                      │
└─────────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          PASS 2                                     │
│  • Read intermediate file                                           │
│  • Use SYMBOL TABLE to resolve addresses                            │
│  • Determine addressing modes                                        │
│  • Calculate displacements                                           │
│  • Generate OBJECT CODE for each instruction                         │
│  • Create object program (H, T, M, E records)                        │
└─────────────────────────────────────────────────────────────────────┘
```

### Key Data Structures

1. **OPTAB (Operation Table)**: Contains all valid opcodes
   - Key: Mnemonic (e.g., "LDA")
   - Value: Opcode hex value + format (e.g., 0x00, format 3)

2. **SYMTAB (Symbol Table)**: Built during Pass 1
   - Key: Label name (e.g., "BUFFER")
   - Value: Address (e.g., 0x102D)

3. **LOCCTR (Location Counter)**: Tracks current address during assembly

---

## 4. Pass 1: Symbol Table & Address Assignment

### Algorithm Pseudo-code

```
1. Initialize LOCCTR = 0 (or START address if specified)
2. Initialize SYMTAB = empty

3. FOR each source line:
   
   a. IF opcode is "START":
      - Set LOCCTR = operand value
      - Set program name = label
      - CONTINUE
   
   b. IF opcode is "END":
      - Record final LOCCTR
      - BREAK
   
   c. IF label exists:
      - IF label already in SYMTAB:
          ERROR: "Duplicate symbol"
      - ELSE:
          SYMTAB[label] = LOCCTR
   
   d. Calculate instruction size:
      - Format 1: 1 byte
      - Format 2: 2 bytes
      - Format 3: 3 bytes
      - Format 4: 4 bytes (+ prefix)
      - BYTE: depends on constant
      - WORD: 3 bytes
      - RESB: n bytes
      - RESW: n × 3 bytes
   
   e. Save current LOCCTR for this line
   
   f. LOCCTR = LOCCTR + instruction size

4. Program Length = final LOCCTR - start address
```

### Example: Pass 1 Trace

```assembly
COPY    START   1000
FIRST   STL     RETADR
        LDB     #LENGTH
CLOOP   +JSUB   RDREC
        ...
RETADR  RESW    1
LENGTH  RESW    1
BUFFER  RESB    4096
        END     FIRST
```

| Line | LOCCTR | Label | Opcode | Size | SYMTAB Update |
|------|--------|-------|--------|------|---------------|
| 1 | 1000 | COPY | START | 0 | COPY=1000 |
| 2 | 1000 | FIRST | STL | 3 | FIRST=1000 |
| 3 | 1003 | - | LDB | 3 | - |
| 4 | 1006 | CLOOP | +JSUB | 4 | CLOOP=1006 |
| ... | ... | ... | ... | ... | ... |
| n | 102A | RETADR | RESW | 3 | RETADR=102A |
| n+1 | 102D | LENGTH | RESW | 3 | LENGTH=102D |
| n+2 | 1030 | BUFFER | RESB | 4096 | BUFFER=1030 |

---

## 5. Pass 2: Object Code Generation

### Algorithm Pseudo-code

```
1. Load SYMTAB from Pass 1
2. Set BASE = null

3. FOR each intermediate entry:
   
   a. IF directive:
      - "BASE": Set BASE = SYMTAB[operand]
      - "NOBASE": Set BASE = null
      - "BYTE": Generate hex from constant
      - "WORD": Generate 3-byte value
      - Others: No object code
   
   b. IF instruction:
      - Determine format (1, 2, 3, or 4)
      - Determine addressing mode (n, i flags)
      - Calculate target address from SYMTAB
      - Calculate displacement (PC or BASE relative)
      - Set nixbpe flags
      - Generate object code
   
   c. Mark if modification record needed
      (Format 4 with relocatable address)
```

### Object Code Generation by Format

#### Format 1 (1 byte)
```
Just the opcode: [OP]
Example: FIX → C4
```

#### Format 2 (2 bytes)
```
[OP] [r1 r2]
Example: ADDR A,B → 90 03
         (90 = opcode, 0 = A, 3 = B)
```

#### Format 3 (3 bytes) - Most Common
```
[6-bit OP + nixbpe] [12-bit displacement]
Example: LDA BUFFER
```

#### Format 4 (4 bytes)
```
[6-bit OP + nixbpe] [20-bit address]
Example: +JSUB RDREC
```

---

## 6. Instruction Formats (1, 2, 3, 4)

### Visual Representation

```
FORMAT 1 (1 byte):
┌────────────────┐
│    8-bit OP    │
└────────────────┘

FORMAT 2 (2 bytes):
┌────────────────┬────────┬────────┐
│    8-bit OP    │  r1(4) │  r2(4) │
└────────────────┴────────┴────────┘

FORMAT 3 (3 bytes):
┌──────────────┬───┬───┬───┬───┬───┬───┬────────────────┐
│   OP (6)     │ n │ i │ x │ b │ p │ e │  disp (12)     │
│  bits 23-18  │17 │16 │15 │14 │13 │12 │   bits 11-0    │
└──────────────┴───┴───┴───┴───┴───┴───┴────────────────┘

FORMAT 4 (4 bytes):
┌──────────────┬───┬───┬───┬───┬───┬───┬────────────────────────┐
│   OP (6)     │ n │ i │ x │ b │ p │ e │     address (20)       │
│  bits 31-26  │25 │24 │23 │22 │21 │20 │      bits 19-0         │
└──────────────┴───┴───┴───┴───┴───┴───┴────────────────────────┘
```

### When to Use Each Format

| Format | When Used | Example |
|--------|-----------|---------|
| 1 | No operands | FIX, FLOAT, NORM |
| 2 | Register operations | ADDR A,B / CLEAR X |
| 3 | Memory reference (default) | LDA BUFFER |
| 4 | Extended (+ prefix), 20-bit address | +JSUB RDREC |

---

## 7. Addressing Modes & NIXBPE Flags

### The NIXBPE Flags

| Flag | Meaning | Values |
|------|---------|--------|
| **n** | Indirect | 1 = yes, 0 = no |
| **i** | Immediate | 1 = yes, 0 = no |
| **x** | Indexed | 1 = yes, 0 = no |
| **b** | Base-relative | 1 = yes, 0 = no |
| **p** | PC-relative | 1 = yes, 0 = no |
| **e** | Extended (Format 4) | 1 = yes, 0 = no |

### Addressing Mode Table

| n | i | Mode | Syntax | Meaning |
|---|---|------|--------|---------|
| 0 | 0 | SIC Compatible | operand | Direct addressing (SIC) |
| 0 | 1 | Immediate | #operand | Value IS the operand |
| 1 | 0 | Indirect | @operand | Address OF address |
| 1 | 1 | Simple/Direct | operand | Normal memory access |

### Examples

```assembly
LDA     #100      ; Immediate: n=0, i=1, load value 100
LDA     @PTR      ; Indirect: n=1, i=0, load from address in PTR
LDA     BUFFER    ; Simple: n=1, i=1, load from BUFFER address
LDA     TABLE,X   ; Indexed: n=1, i=1, x=1, load from TABLE+X
```

### Complete NIXBPE Example

```
Instruction: LDA BUFFER (Format 3, PC-relative)

Given:
  - Opcode for LDA = 0x00 (binary: 000000)
  - Current LOCCTR = 0x0006
  - PC after fetch = 0x0009
  - BUFFER address = 0x0036
  - Displacement = 0x0036 - 0x0009 = 0x002D

Flags:
  n=1, i=1 (simple addressing)
  x=0 (not indexed)
  b=0, p=1 (PC-relative)
  e=0 (Format 3)

Object Code Construction:
  Opcode (6 bits): 000000
  nixbpe (6 bits): 110010
  Displacement (12 bits): 000000101101

  Binary: 000000 110010 000000101101
  Hex: 03 20 2D
```

---

## 8. Displacement Calculation (PC-Relative vs BASE-Relative)

### The Problem

Format 3 only has 12 bits for displacement, which limits range:
- **Signed (PC-relative)**: -2048 to +2047
- **Unsigned (BASE-relative)**: 0 to 4095

### PC-Relative (Preferred)

```
displacement = Target Address - PC

Where PC = current LOCCTR + 3 (points to NEXT instruction)

Range: -2048 ≤ displacement ≤ 2047
Flags: b=0, p=1
```

### BASE-Relative (Fallback)

```
displacement = Target Address - BASE

Where BASE = value set by "BASE" directive

Range: 0 ≤ displacement ≤ 4095
Flags: b=1, p=0
```

### Algorithm

```
FUNCTION calculateDisplacement(targetAddress, currentLOCCTR, BASE):
    
    PC = currentLOCCTR + 3   // Next instruction address
    
    // Try PC-relative first
    disp = targetAddress - PC
    IF -2048 ≤ disp ≤ 2047:
        RETURN { displacement: disp, b: 0, p: 1 }
    
    // Try BASE-relative if BASE is set
    IF BASE is not null:
        disp = targetAddress - BASE
        IF 0 ≤ disp ≤ 4095:
            RETURN { displacement: disp, b: 1, p: 0 }
    
    // Neither works → Use Format 4 (extended)
    ERROR: "Displacement out of range, use + prefix"
```

### Worked Example

```
Current instruction at LOCCTR = 0x0006
Next instruction (PC) = 0x0006 + 3 = 0x0009
Target: BUFFER at 0x0036

PC-relative displacement:
  = 0x0036 - 0x0009 
  = 0x002D (45 in decimal)
  = within range [-2048, 2047] ✓

Use PC-relative with displacement 0x02D
```

---

## 9. Object Program Records (H, T, M, E)

### Header Record (H)

```
Format: H^PROGNAME^STARTADDR^LENGTH

Example: H^COPY  ^001000^00107A

Fields:
  - PROGNAME: 6 characters, left-justified, space-padded
  - STARTADDR: 6 hex digits, starting address
  - LENGTH: 6 hex digits, program length in bytes
```

### Text Record (T)

```
Format: T^STARTADDR^LENGTH^OBJECTCODE

Example: T^001000^1E^141033482039...

Fields:
  - STARTADDR: 6 hex digits, starting address of this record
  - LENGTH: 2 hex digits, number of bytes (max 30 = 0x1E)
  - OBJECTCODE: up to 60 hex characters (30 bytes)
```

### Modification Record (M)

```
Format: M^ADDRESS^LENGTH^+PROGNAME

Example: M^001007^05^+COPY

Fields:
  - ADDRESS: 6 hex digits, address to modify
  - LENGTH: 2 hex digits, length in half-bytes (usually 05)
  - +PROGNAME: Symbol to add during relocation

Purpose: Tells the loader which addresses need adjustment
         when the program is loaded at a different address
```

### End Record (E)

```
Format: E^FIRSTEXEC

Example: E^001000

Fields:
  - FIRSTEXEC: 6 hex digits, address of first executable instruction
```

### Complete Object Program Example

```
H^COPY  ^001000^00107A
T^001000^1E^17202D69202D4B101036...
T^00101E^15^0F2016480017...
M^001007^05^+COPY
M^001014^05^+COPY
E^001000
```

---

## 10. Project Architecture & Components

### File Structure

```
app/assembler/
├── page.tsx              # Main assembler page
├── components/
│   ├── Editor.tsx        # Code editor (Monaco)
│   ├── Pass1Table.tsx    # Shows Pass 1 results
│   ├── Pass2Table.tsx    # Shows Pass 2 results
│   ├── ObjectProgram.tsx # Shows H/T/M/E records
│   ├── MemoryView.tsx    # Memory visualization
│   └── InstructionBreakdown.tsx  # nixbpe breakdown
└── lib/
    ├── lexer.ts          # Tokenizes source code
    ├── parser.ts         # Validates syntax
    ├── optab.ts          # Operation table
    ├── sicxePass1.ts     # Pass 1 algorithm
    ├── sicxePass2.ts     # Pass 2 algorithm
    ├── objectProgram.ts  # H/T/M/E generation
    ├── memoryLoader.ts   # Loads into memory
    ├── types.ts          # TypeScript interfaces
    └── store.ts          # State management
```

### Data Flow

```
User Input (Assembly Code)
        ↓
    lexer.ts (Tokenization)
        ↓
    parser.ts (Validation)
        ↓
    sicxePass1.ts (Symbol Table + LOCCTR)
        ↓
    sicxePass2.ts (Object Code)
        ↓
    objectProgram.ts (H/T/M/E Records)
        ↓
    memoryLoader.ts (Load to Memory)
        ↓
    UI Components (Visualization)
```

### Key TypeScript Interfaces

```typescript
// Source line after tokenization
interface TokenizedLine {
    lineNumber: number;
    label?: string;
    opcode: string;
    operand?: string;
    isExtended?: boolean;      // + prefix
    addressingPrefix?: '#' | '@';
    indexed?: boolean;         // ,X suffix
    isComment?: boolean;
    isEmpty?: boolean;
}

// Symbol table entry
type SymbolTable = Record<string, number>;  // label → address

// Pass 1 result
interface Pass1Result {
    intermediateFile: IntermediateEntry[];
    symbolTable: SymbolTable;
    programName: string;
    startAddress: number;
    programLength: number;
    errors: AssemblerError[];
}

// NIXBPE flags
interface NixbpeFlags {
    n: 0 | 1;
    i: 0 | 1;
    x: 0 | 1;
    b: 0 | 1;
    p: 0 | 1;
    e: 0 | 1;
}
```

---

## 11. Frontend Architecture & UI

### Technology Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe JavaScript |
| **TailwindCSS** | Utility-first CSS styling |
| **shadcn/ui** | Pre-built UI components (buttons, cards, tabs) |
| **Monaco Editor** | VS Code-like code editor |
| **Zustand** | Lightweight state management |

### Page Layout Structure

The main assembler page (`app/assembler/page.tsx`) uses a **resizable panel layout**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         HEADER                                  │
│  [SIC/XE Assembler Simulator]  [Phase Badge]  [Error Count]    │
├────────────────────────────────┬────────────────────────────────┤
│                                │                                │
│    LEFT COLUMN (50%)           │    RIGHT COLUMN (50%)          │
│                                │                                │
│  ┌──────────────────────────┐  │  ┌──────────────────────────┐  │
│  │                          │  │  │        TABS              │  │
│  │    CODE EDITOR           │  │  │ [Pass1][Pass2][Object]   │  │
│  │    (Monaco)              │  │  │ [Memory][Errors]         │  │
│  │                          │  │  ├──────────────────────────┤  │
│  │  - Syntax highlighting   │  │  │                          │  │
│  │  - Autocomplete          │  │  │   TAB CONTENT            │  │
│  │  - Error markers         │  │  │                          │  │
│  │                          │  │  │   - Pass1Table           │  │
│  └──────────────────────────┘  │  │   - Pass2Table           │  │
│  ┌──────────────────────────┐  │  │   - ObjectProgram        │  │
│  │                          │  │  │   - MemoryView           │  │
│  │  INSTRUCTION BREAKDOWN   │  │  │   - ErrorPanel           │  │
│  │                          │  │  │                          │  │
│  │  - nixbpe flags          │  │  └──────────────────────────┘  │
│  │  - Displacement calc     │  │                                │
│  │  - Object code bits      │  │                                │
│  └──────────────────────────┘  │                                │
│                                │                                │
├────────────────────────────────┴────────────────────────────────┤
│                         FOOTER                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Editor.tsx** - Code Editor Component

```tsx
// Features:
// - Monaco Editor (same editor as VS Code)
// - SIC/XE syntax highlighting
// - IntelliSense autocomplete for instructions & directives
// - Line number gutter
// - Error highlighting

// Key buttons:
// [Assemble] - Run full assembly (Lexer → Pass1 → Pass2 → Object)
// [Step]     - Run one phase at a time
// [Reset]    - Clear all results
// [Examples] - Load sample programs
```

#### 2. **Pass1Table.tsx** - Pass 1 Results

Displays:
- **Symbol Table (SYMTAB)**: All labels with their addresses
- **Intermediate File**: Table showing:
  - Line number
  - LOCCTR (location counter)
  - Label, Opcode, Operand
  - Size (bytes)

```tsx
// User can click on any row to select it
// Selected row shows detailed breakdown in InstructionBreakdown panel
```

#### 3. **Pass2Table.tsx** - Pass 2 Results

Displays:
- **Object Code**: Generated hex code for each line
- **nixbpe Flags**: Addressing flags as visual badges
- **Displacement Mode**: PC-relative or BASE-relative

#### 4. **ObjectProgram.tsx** - Final Output

Shows the complete object program:
- **H Record** (Header)
- **T Records** (Text/Code)
- **M Records** (Modification)
- **E Record** (End)

Each record is color-coded and explained.

#### 5. **MemoryView.tsx** - Memory Visualization

- Grid of memory bytes
- Color-coded: code vs data vs empty
- Hover shows: address, hex value, ASCII, source line
- Visual representation of loaded program

#### 6. **InstructionBreakdown.tsx** - Detailed Analysis

When user selects a line, shows:
- Source instruction
- Format (1, 2, 3, or 4)
- Object code in hex
- nixbpe flags with visual indicators
- Target address calculation
- Displacement mode and value
- Binary breakdown of object code

### UI Component Library (shadcn/ui)

The project uses these pre-built components:

| Component | Usage |
|-----------|-------|
| `Card` | Container for panels |
| `Button` | Actions (Assemble, Reset) |
| `Badge` | Status indicators, flags |
| `Tabs` | Switch between Pass1/Pass2/Object/Memory |
| `Table` | Display intermediate file, symbol table |
| `ScrollArea` | Scrollable content areas |
| `Tooltip` | Hover explanations |
| `ResizablePanel` | Drag to resize editor vs results |

### Example: How a Button Click Triggers Assembly

```tsx
// In Editor.tsx
<Button onClick={() => assemble()}>
  <Play className="mr-2 h-4 w-4" />
  Assemble
</Button>

// The assemble() function comes from Zustand store
// It runs: Lexer → Parser → Pass1 → Pass2 → Generate Object Program
```

---

## 12. State Management with Zustand

### What is Zustand?

Zustand is a **lightweight state management library** for React. It's simpler than Redux but powerful enough for this project.

### The Store Structure (`store.ts`)

```typescript
interface AssemblerState {
  // Input
  sourceCode: string;           // User's assembly code
  
  // Processing phase
  currentPhase: 'idle' | 'lexing' | 'parsing' | 'pass1' | 'pass2' | 'complete' | 'error';
  
  // Intermediate results
  tokenizedLines: TokenizedLine[];  // After lexer
  pass1Result: Pass1Result | null;  // Symbol table, intermediate file
  pass2Result: Pass2Result | null;  // Object codes, nixbpe
  objectProgram: ObjectProgram | null;  // H/T/M/E records
  memory: Memory | null;            // Loaded program in memory
  
  // Error tracking
  errors: AssemblerError[];
  
  // UI state
  selectedLineNumber: number | null;  // Which line user clicked
  selectedMemoryAddress: number | null;
}
```

### Store Actions (Functions)

```typescript
interface AssemblerActions {
  // Source code
  setSourceCode: (code: string) => void;

  // Assembly process (each step)
  runLexer: () => void;      // Tokenize source code
  runParser: () => void;     // Validate syntax
  runPass1: () => void;      // Build symbol table
  runPass2: () => void;      // Generate object code
  generateProgram: () => void;  // Create H/T/M/E records
  loadIntoMemory: () => void;   // Load into memory array

  // Convenience
  assemble: () => void;      // Run ALL steps at once
  reset: () => void;         // Clear everything

  // UI interaction
  selectLine: (lineNumber: number | null) => void;
  selectMemoryAddress: (address: number | null) => void;
}
```

### How Components Use the Store

```tsx
// Any component can access state and actions:
import { useAssemblerStore } from '../lib/store';

function MyComponent() {
  // Get state values
  const { sourceCode, pass1Result, errors } = useAssemblerStore();
  
  // Get actions
  const { setSourceCode, runPass1, assemble } = useAssemblerStore();
  
  // Use in JSX
  return (
    <div>
      <p>Errors: {errors.length}</p>
      <button onClick={assemble}>Assemble</button>
    </div>
  );
}
```

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZUSTAND STORE                               │
│                    (Single Source of Truth)                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│    Editor     │   │  Pass1Table   │   │ MemoryView    │
│               │   │               │   │               │
│ sourceCode ◄──┼───┤ pass1Result   │   │ memory        │
│ setSourceCode │   │ selectLine    │   │ selectedAddr  │
│ assemble()    │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘
        │                   │                   │
        │                   ▼                   │
        │           ┌───────────────┐           │
        │           │ Instruction   │           │
        │           │ Breakdown     │           │
        │           │               │           │
        │           │ pass2Result   │◄──────────┘
        │           │ selectedLine  │
        │           └───────────────┘
        │
        ▼
  User types code → setSourceCode() → state updates → all components re-render
```

### The `assemble()` Function Flow

```typescript
assemble: () => {
  const state = get();
  
  // Step 1: Reset previous results
  set({ errors: [], currentPhase: 'idle' });
  
  // Step 2: Run Lexer
  get().runLexer();
  if (get().currentPhase === 'error') return;
  
  // Step 3: Run Parser
  get().runParser();
  if (get().currentPhase === 'error') return;
  
  // Step 4: Run Pass 1
  get().runPass1();
  if (get().currentPhase === 'error') return;
  
  // Step 5: Run Pass 2
  get().runPass2();
  if (get().currentPhase === 'error') return;
  
  // Step 6: Generate Object Program
  get().generateProgram();
  if (get().currentPhase === 'error') return;
  
  // Step 7: Load into Memory
  get().loadIntoMemory();
  
  // Done!
  set({ currentPhase: 'complete' });
}
```

### Why Zustand?

| Feature | Benefit |
|---------|---------|
| **Simple API** | Just `create()` and `useStore()` |
| **No boilerplate** | No actions, reducers, providers |
| **TypeScript support** | Full type inference |
| **Reactive** | Components auto-update when state changes |
| **DevTools** | Can inspect state in browser |

---

## 13. Key Algorithms in Code

### OPTAB Structure (optab.ts)

```typescript
export const OPTAB = {
  'ADD':  { opcode: 0x18, format: 3, operands: 1 },
  'LDA':  { opcode: 0x00, format: 3, operands: 1 },
  'STA':  { opcode: 0x0C, format: 3, operands: 1 },
  'J':    { opcode: 0x3C, format: 3, operands: 1 },
  'JSUB': { opcode: 0x48, format: 3, operands: 1 },
  'RSUB': { opcode: 0x4C, format: 3, operands: 0 },
  'ADDR': { opcode: 0x90, format: 2, operands: 2 },
  'FIX':  { opcode: 0xC4, format: 1, operands: 0 },
  // ... more instructions
};
```

### Size Calculation (Pass 1)

```typescript
function calculateInstructionSize(line: TokenizedLine): number {
    const opcode = line.opcode.toUpperCase();
    
    // Extended format
    if (opcode.startsWith('+')) {
        return 4;
    }
    
    // Directives
    switch (opcode) {
        case 'START': case 'END': case 'BASE': case 'NOBASE':
            return 0;
        case 'BYTE':
            return calculateByteConstantSize(line.operand);
        case 'WORD':
            return 3;
        case 'RESB':
            return parseInt(line.operand);
        case 'RESW':
            return parseInt(line.operand) * 3;
    }
    
    // Instructions from OPTAB
    return OPTAB[opcode]?.format || 0;
}
```

### Displacement Calculation (Pass 2)

```typescript
function calculateDisplacement(
    targetAddress: number,
    pc: number,
    baseRegister: number | null
): { displacement: number; b: number; p: number; error?: string } {
    
    // Try PC-relative first
    const pcDisp = targetAddress - pc;
    if (pcDisp >= -2048 && pcDisp <= 2047) {
        return { displacement: pcDisp & 0xFFF, b: 0, p: 1 };
    }
    
    // Try BASE-relative
    if (baseRegister !== null) {
        const baseDisp = targetAddress - baseRegister;
        if (baseDisp >= 0 && baseDisp <= 4095) {
            return { displacement: baseDisp, b: 1, p: 0 };
        }
    }
    
    // Error: need Format 4
    return { 
        displacement: 0, 
        b: 0, 
        p: 0, 
        error: "Displacement out of range, use + prefix" 
    };
}
```

### Object Code Building (Format 3)

```typescript
function buildFormat3ObjectCode(
    opcode: number,
    nixbpe: NixbpeFlags,
    displacement: number
): string {
    // First 6 bits: opcode
    // Next 6 bits: nixbpe
    // Last 12 bits: displacement
    
    const byte1 = (opcode & 0xFC) | (nixbpe.n << 1) | nixbpe.i;
    const byte2 = (nixbpe.x << 7) | (nixbpe.b << 6) | 
                  (nixbpe.p << 5) | (nixbpe.e << 4) | 
                  ((displacement >> 8) & 0x0F);
    const byte3 = displacement & 0xFF;
    
    return byte1.toString(16).padStart(2, '0') +
           byte2.toString(16).padStart(2, '0') +
           byte3.toString(16).padStart(2, '0');
}
```

---

## 14. Common Questions & Answers

### Q1: Why is it called a "two-pass" assembler?

**Answer**: The assembler makes two complete passes through the source code:
- **Pass 1**: Builds the symbol table and assigns addresses
- **Pass 2**: Uses the symbol table to generate object code

This solves the **forward reference problem** where a label might be used before it's defined.

---

### Q2: What's the difference between PC-relative and BASE-relative addressing?

**Answer**:
| | PC-Relative | BASE-Relative |
|--|-------------|---------------|
| Reference | Program Counter | BASE register |
| Range | -2048 to +2047 (signed) | 0 to 4095 (unsigned) |
| Flags | b=0, p=1 | b=1, p=0 |
| Advantage | No setup needed | Larger forward range |
| Disadvantage | Limited backward range | Requires BASE directive |

---

### Q3: When do we need modification records?

**Answer**: Modification records are needed when:
1. Using **Format 4** instructions
2. With **relocatable addresses** (symbols, not immediate values)
3. For the **loader** to adjust addresses when loading at a different address

Example: `+JSUB RDREC` needs modification because RDREC's address will change based on where the program is loaded.

---

### Q4: What happens if the displacement is out of range?

**Answer**: If PC-relative and BASE-relative both fail:
1. **Error**: "Displacement out of range"
2. **Solution**: Use Format 4 with `+` prefix
   - `+JSUB RDREC` instead of `JSUB RDREC`
   - Format 4 has 20 bits for address (0 to 1,048,575)

---

### Q5: How does immediate addressing work?

**Answer**:
- Syntax: `#value` (e.g., `LDA #100`)
- Flags: n=0, i=1
- The operand value IS the data, not an address
- Can be a number: `#100` or a symbol: `#LENGTH`

---

### Q6: How does indexed addressing work?

**Answer**:
- Syntax: `operand,X` (e.g., `LDA TABLE,X`)
- Flag: x=1
- Target Address = base address + X register value
- Used for accessing arrays: TABLE,X accesses TABLE[X]

---

### Q7: What are the assembler directives?

**Answer**:
| Directive | Purpose |
|-----------|---------|
| START | Define program name and start address |
| END | Mark end of program |
| BYTE | Define character or hex constant |
| WORD | Define 3-byte integer constant |
| RESB | Reserve bytes |
| RESW | Reserve words (3 bytes each) |
| BASE | Set base register value |
| NOBASE | Disable base-relative addressing |
| EQU | Define symbol value |
| ORG | Set location counter |

---

### Q8: How is the opcode encoded in Format 3/4?

**Answer**: The opcode is stored in the first 6 bits (bits 23-18 for Format 3):
```
Actual opcode value = (instruction byte 1) AND 0xFC

Example: LDA opcode = 0x00
In object code: 03202D
  - 03 = 0000 0011
  - First 6 bits = 000000 = 0x00 = LDA ✓
  - Next 2 bits = 11 = n=1, i=1 (simple addressing)
```

---

### Q9: How does the frontend communicate with the assembler logic?

**Answer**: Through **Zustand state management**:
1. User types code → `setSourceCode()` updates store
2. User clicks "Assemble" → `assemble()` runs all phases
3. Each phase updates store: `pass1Result`, `pass2Result`, etc.
4. React components automatically re-render when store changes
5. No API calls needed - everything runs client-side in the browser

---

### Q10: Why use Monaco Editor?

**Answer**: Monaco is the same editor that powers VS Code:
- **Syntax highlighting** for SIC/XE
- **IntelliSense** autocomplete for instructions
- **Error markers** on invalid lines
- **Line numbers** and code folding
- Professional editing experience

---

### Q11: How do the resizable panels work?

**Answer**: Using `ResizablePanelGroup` from shadcn/ui:
```tsx
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={50}>  {/* Left: Editor */}
  <ResizableHandle withHandle />      {/* Draggable divider */}
  <ResizablePanel defaultSize={50}>  {/* Right: Results */}
</ResizablePanelGroup>
```
Users can drag the handles to resize panels to their preference.

---

### Q12: What happens when I click on a line in the table?

**Answer**:
1. `selectLine(lineNumber)` is called
2. Store updates `selectedLineNumber`
3. `InstructionBreakdown` component reads this value
4. It finds the matching `Pass2Entry` for that line
5. Displays detailed breakdown: format, nixbpe, displacement, etc.

---

## Quick Reference Card

### Format 3 Object Code Construction

```
┌────────────────────────────────────────────────────┐
│     Byte 1     │     Byte 2     │     Byte 3     │
├────────────────┼────────────────┼────────────────┤
│ OOOOOO nn      │ ixbp eddd      │ dddddddd       │
│ opcode  n i    │ x b p e disp   │  displacement  │
└────────────────┴────────────────┴────────────────┘

O = opcode (6 bits from actual opcode)
n, i, x, b, p, e = flags (1 bit each)
d = displacement (12 bits total)
```

### Frontend Architecture Summary

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js App Router                           │
│                                                                 │
│  app/                                                           │
│  ├── page.tsx (Landing)                                         │
│  └── assembler/                                                 │
│      ├── page.tsx (Main UI with panels)                        │
│      ├── components/                                            │
│      │   ├── Editor.tsx      ← Monaco + Controls               │
│      │   ├── Pass1Table.tsx  ← SYMTAB + Intermediate           │
│      │   ├── Pass2Table.tsx  ← Object Codes + Flags            │
│      │   ├── ObjectProgram.tsx ← H/T/M/E Records               │
│      │   ├── MemoryView.tsx  ← Byte Grid Visualization         │
│      │   └── InstructionBreakdown.tsx ← nixbpe Details         │
│      └── lib/                                                   │
│          ├── store.ts        ← Zustand State Management        │
│          ├── lexer.ts        ← Tokenization                    │
│          ├── parser.ts       ← Syntax Validation               │
│          ├── sicxePass1.ts   ← Symbol Table + LOCCTR           │
│          ├── sicxePass2.ts   ← Object Code Generation          │
│          └── objectProgram.ts ← H/T/M/E Generation             │
└─────────────────────────────────────────────────────────────────┘
```

### Common Opcodes to Remember

| Instruction | Opcode | Format |
|-------------|--------|--------|
| LDA | 00 | 3/4 |
| LDX | 04 | 3/4 |
| STA | 0C | 3/4 |
| ADD | 18 | 3/4 |
| SUB | 1C | 3/4 |
| COMP | 28 | 3/4 |
| J | 3C | 3/4 |
| JEQ | 30 | 3/4 |
| JLT | 38 | 3/4 |
| JSUB | 48 | 3/4 |
| RSUB | 4C | 3/4 |
| LDCH | 50 | 3/4 |
| STCH | 54 | 3/4 |

---

## Good Luck with Your Discussion! 🎓

Remember:
1. **Pass 1** = Build symbol table + assign addresses
2. **Pass 2** = Generate object code using symbol table
3. **PC-relative first**, BASE-relative as fallback
4. **Format 4** when displacement doesn't fit
5. **NIXBPE** flags determine addressing mode and displacement type

---

*This study guide was generated for the SIC/XE Assembler Simulator project.*
