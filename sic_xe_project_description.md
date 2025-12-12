# 📘 **Project Description — SIC/SIC-XE Assembler Simulator (Web-Based)**

**Stack:** Next.js (App Router) + TailwindCSS + shadcn/ui **Goal:** A fully interactive, visual, step-by-step SIC/XE assembler simulator.

---

# 1. **High-Level Summary**

The project is a **web-based interactive educational tool** that simulates the full workflow of the SIC/SIC-XE assembler. Users paste assembly code, and the application performs all assembler phases in a transparent, visual manner:

- **Lexing + Parsing**
- **Pass 1: symbol table + location counter + intermediate file**
- **Pass 2: object code generation**
- **Object program output (H, T, M, E records)**
- **Memory loader**
- **Memory visualization (byte-by-byte)**
- **Execution visualization (where each instruction sits in memory)**

The simulator must allow users to step through every stage, view intermediate tables, and understand how the assembler translates code to executable object code.

This site should function like a combined:\
**Assembler + Visual Debugger + Memory Inspector + Teaching Tool.**

---

# 2. **User Experience (UX) Overview**

## **2.1 Landing Page**

- Explains what SIC/SIC-XE are.
- Buttons:
  - **Start Simulation**
  - **Load Example Programs**
  - **Learn About SIC/SICXE** (opens documentation in modal or separate page)

## **2.2 Workspace Layout**

The main simulation page is divided into **four synchronized panels**:

### **Panel A — Assembly Input**

- Code editor (Monaco recommended via external library)
- Syntax highlighting for SIC/SIC-XE
- Auto-indentation
- Buttons:
  - **Run Pass 1**
  - **Run Pass 2**
  - **Assemble**
  - **Load Into Memory**
  - **Reset**

### **Panel B — Intermediate Output**

Tabs:

- **Pass 1 Table (Location Counter + Symbols + Flags)**
- **Pass 2 Table (Object Code per line)**
- **Final Object Program (H/T/M/E records)**

Each tab updates when the corresponding phase completes.

### **Panel C — Memory Visualization**

A grid of 4096 (SIC) or much larger for SIC/XE:

- Each cell = 1 byte
- Colored to show:
  - Program bytes
  - Reserved memory
  - Empty memory
  - Modification records
- Hover shows:
  - Address
  - Hex
  - ASCII (if printable)
  - Origin instruction

### **Panel D — Step-by-Step Visualizer**

Shows details of the currently processed instruction:

- Addressing mode
- Opcode format (1,2,3,4)
- Displacement calculation (PC-relative or BASE-relative)
- Flags (n,i,x,b,p,e) with colored indicators
- Breakdown of object code fields

---

# 3. **User Story Descriptions**

### **US-1: Write Assembly Code**

**As a user**, I want to paste or type SIC/SICXE assembly code into a code editor so that I can assemble it.

### **US-2: Run Pass 1**

I want to see:

- Current line
- Location counter changes
- Symbol insertion into the SYMTAB
- Errors (duplicate symbols, invalid operands)

### **US-3: Run Pass 2**

I want to see:

- Instruction decoding
- Addressing mode detection
- Target address calculation
- PC-relative vs BASE-relative choice
- Object code creation

### **US-4: Generate Final Object Program**

I want to see:

- H record (header)
- T records (text)
- M records (modification)
- E record (end) With explanations of each field.

### **US-5: Visual Memory Loader**

I want the object program to be placed into memory visually so I can explore how the program truly looks inside memory.

### **US-6: Step-Through Visualization**

I want tooltips and animations that explain:

- How displacements are computed
- Why PC-relative or BASE-relative is chosen
- How indexed addressing modifies the TA
- How extended format (e = 1) affects the result

### **US-7: Learn Mode**

A documentation panel explaining:

- SIC architecture
- SIC/XE architecture
- Assembler passes
- Object program format
- Example programs

---

# 4. **Technical Architecture — Next.js + Components**

## **4.1 Project Structure**

```
app/
  layout.tsx
  page.tsx
  assembler/
    page.tsx
    components/
       Editor.tsx
       Pass1Table.tsx
       Pass2Table.tsx
       ObjectProgram.tsx
       MemoryView.tsx
       InstructionBreakdown.tsx
       StepController.tsx
    lib/
       lexer.ts
       parser.ts
       sicxePass1.ts
       sicxePass2.ts
       objectProgram.ts
       memoryLoader.ts
       instructionDecoder.ts
       utils.ts
  docs/
    page.tsx
components/ui/  <-- shadcn components
styles/
```

## **4.2 Component Responsibilities**

### **Editor.tsx**

- Monaco editor
- Input state stored via zustand or server actions
- Events: onChange, onAssemble, etc.

### **Pass1Table.tsx**

Shows table with columns:

- Line #
- Label
- Opcode
- Operand
- LOCCTR
- Symbol Table state snapshot

### **Pass2Table.tsx**

Shows:

- Line #
- Format
- Flags (n,i,x,b,p,e)
- Target Addressing Type
- Object Code

### **ObjectProgram.tsx**

- Renders H, T, M, E records
- Styled with shadcn Cards

### **MemoryView\.tsx**

- Grid of bytes
- Virtualized grid for performance (e.g. react-window)
- On hover: show popover with details

### **InstructionBreakdown.tsx**

- n/i/x/b/p/e toggles
- PC-relative displacement calculation formula visualization
- BASE-relative fallback detection

---

# 5. **Data Models**

## **5.1 Source Line Representation**

```ts
interface SourceLine {
  lineNumber: number;
  label?: string;
  opcode: string;
  operand?: string;
  comment?: string;
  location?: number;
  objectCode?: string;
}
```

## **5.2 Symbol Table**

```ts
type SymbolTable = Record<string, number>;
```

## **5.3 Intermediate File (Pass 1 Output)**

```ts
interface IntermediateEntry {
  line: SourceLine;
  locctr: number;
  flags?: any;
}
```

## **5.4 Object Program Structure**

```ts
interface ObjectProgram {
  header: string;
  textRecords: string[];
  modificationRecords: string[];
  endRecord: string;
}
```

## **5.5 Memory Model**

```ts
interface Memory {
  bytes: Uint8Array;
  programStart: number;
  programEnd: number;
}
```

---

# 6. **Algorithm Explanation (Assembler Logic)**

The agent must implement **exact SIC/XE assembler rules**, not approximations.

---

## **6.1 What SIC and SIC/XE Are**

### **SIC (Simplified Instructional Computer)**

- 24-bit addresses
- No indexed, indirect, immediate flags in opcode
- 3 instruction formats (1,2,3)

### **SIC/XE**

- Extensions:
  - Format 4 (extended 4-byte instructions)
  - Indexed addressing
  - Indirect addressing
  - Immediate addressing
  - PC-relative addressing
  - BASE-relative addressing
  - Register-to-register instructions
  - Larger memory

### **Addressing Flags**

```
n i x b p e
```

- n=1: indirect
- i=1: immediate
- x=1: indexed
- b=1: base relative
- p=1: PC relative
- e=1: extended format

---

## **6.2 Assembler Pipeline**

### **Pass 1**

Tasks:

1. Initialize LOCCTR = starting address
2. Scan each line:
   - If label exists → add to SYMTAB
   - Determine instruction size → increment LOCCTR accordingly
3. Write intermediate file with LOCCTR for each instruction
4. Determine program length

Errors caught:

- Duplicate label
- Invalid opcode
- Undefined directive
- Out-of-range operands

### **Pass 2**

Tasks:

1. Re-scan lines

2. For each instruction:

   - Identify instruction format (1–4)
   - Determine addressing mode
   - Compute target address:
     - Immediate value
     - Symbol lookup
   - Compute displacement:
     - Prefer **PC-relative**
     - Or fallback to **BASE-relative**
   - Set flags (n,i,x,b,p,e)
   - Construct final object code

3. Build:

   - H record
   - T records
   - M records
   - E record

---

# 7. **Memory Loader Algorithm**

- Read object program
- Parse H record → origin
- Parse T records:
  - Load bytes into memory
- Parse M records:
  - Apply modification (+/-) to addresses

Final memory used for visualization.

---

# 8. **Technical Requirements for Implementation**

### **Assembler must be fully deterministic**

- No assumptions
- No shortcuts
- Must follow textbook SIC/XE rules line by line

### **100% of intermediate data must be visualizable**

- Symbol table
- Location counter per instruction
- Object code per instruction
- T record boundaries
- Addressing mode calculations

### **Memory view must support:**

- Hover inspect
- Address highlighting
- Jump to address
- Color-coded regions

