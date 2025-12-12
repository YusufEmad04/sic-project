/**
 * Example SIC/XE Assembly Programs
 * Pre-loaded sample code for testing the assembler
 */

export const examplePrograms = {
        simple: {
                name: '🟢 Simple (Start Here)',
                description: 'Minimal program - great for beginners',
                code: `SIMPLE  START   0         . Simple SIC/XE program
        LDA     FIVE      . Load value 5 into A
        ADD     THREE     . Add 3 to A (A = 8)
        STA     RESULT    . Store result
        RSUB              . Return
FIVE    WORD    5         . Constant 5
THREE   WORD    3         . Constant 3
RESULT  RESW    1         . Result storage
        END     SIMPLE`
        },

        basic: {
                name: '📋 Copy Program',
                description: 'Classic SIC/XE copy program from textbook',
                code: `COPY    START   1000      . Program starts at address 1000
FIRST   STL     RETADR    . Save return address
        LDB     #LENGTH   . Load base register (immediate)
        BASE    LENGTH    . Establish base register
CLOOP   +JSUB   RDREC     . Read input record (extended)
        LDA     LENGTH    . Test for EOF
        COMP    #0        . Compare with zero (immediate)
        JEQ     ENDFIL    . Exit if EOF found
        +JSUB   WRREC     . Write output record (extended)
        J       CLOOP     . Loop back
ENDFIL  LDA     EOF       . Insert end of file marker
        STA     BUFFER
        LDA     #3        . Set buffer length
        STA     LENGTH
        +JSUB   WRREC     . Write EOF
        J       @RETADR   . Return to OS (indirect)
EOF     BYTE    C'EOF'    . ASCII string constant
RETADR  RESW    1         . Reserve 1 word for return addr
LENGTH  RESW    1         . Reserve 1 word for length
BUFFER  RESB    4096      . Reserve 4096 bytes for buffer
RDREC   RSUB              . Read record subroutine placeholder
WRREC   RSUB              . Write record subroutine placeholder
        END     FIRST     . End of program, specify first exec addr`
        },

        arithmetic: {
                name: '➕ Arithmetic Operations',
                description: 'Add, subtract, compare operations',
                code: `ARITH   START   0         . Start at address 0
        LDA     NUM1      . Load first number (100)
        ADD     NUM2      . Add second number (50)
        STA     SUM       . Store sum (150)
        LDA     NUM1      . Load first number again
        SUB     NUM2      . Subtract (100 - 50 = 50)
        STA     DIFF      . Store difference
        LDA     NUM1      . Load for comparison
        COMP    NUM2      . Compare NUM1 with NUM2
        JGT     BIGGER    . Jump if NUM1 > NUM2
        JEQ     SAME      . Jump if equal
        J       SMALLER   . Otherwise smaller
BIGGER  LDA     #1        . NUM1 is bigger
        J       DONE
SAME    LDA     #0        . They are equal
        J       DONE
SMALLER LDA     #2        . NUM1 is smaller
DONE    STA     FLAG      . Store comparison result
        RSUB              . Return
NUM1    WORD    100       . First number
NUM2    WORD    50        . Second number
SUM     RESW    1         . Sum result
DIFF    RESW    1         . Difference result
FLAG    RESW    1         . Comparison flag
        END     ARITH`
        },

        addressing: {
                name: '📍 Addressing Modes',
                description: 'Immediate, indirect, and indexed addressing',
                code: `ADDR    START   0         . Addressing modes demo
. Immediate addressing (#)
        LDA     #100      . Load immediate value 100
        LDX     #0        . Initialize index to 0
        LDB     #DATA     . Load base with address of DATA
        BASE    DATA      . Set base register
. Simple/Direct addressing
        LDA     VALUE     . Load from memory address VALUE
        STA     RESULT    . Store to memory address RESULT
. Indexed addressing (,X)
        LDX     #3        . Set index to 3
        LDA     TABLE,X   . Load TABLE + X (4th element)
        STA     OUTPUT    . Store it
. Indirect addressing (@)
        LDA     #RESULT   . Load address of RESULT
        STA     PTR       . Store in pointer
        LDA     @PTR      . Load value pointed to by PTR
        STA     COPY      . Store the copy
        RSUB
VALUE   WORD    42        . Simple value
RESULT  RESW    1         . Result storage
TABLE   WORD    10        . Table[0]
        WORD    20        . Table[1]
        WORD    30        . Table[2]
        WORD    40        . Table[3] <- accessed with X=3
        WORD    50        . Table[4]
OUTPUT  RESW    1
PTR     RESW    1         . Pointer variable
COPY    RESW    1
DATA    RESW    1
        END     ADDR`
        },

        loop: {
                name: '🔁 Loop Example',
                description: 'Array processing with TIX loop',
                code: `LOOP    START   0         . Array sum program
        LDA     #0        . Initialize sum to 0
        STA     SUM
        LDX     #0        . Initialize index to 0
NEXT    LDA     SUM       . Load current sum
        ADD     NUMS,X    . Add array element
        STA     SUM       . Store updated sum
        TIX     COUNT     . X = X + 3, compare with COUNT
        JLT     NEXT      . Loop if X < COUNT
        RSUB              . Return when done
. Data section
COUNT   WORD    15        . 5 elements * 3 bytes = 15
NUMS    WORD    10        . Array of 5 numbers
        WORD    20
        WORD    30
        WORD    40
        WORD    50
SUM     RESW    1         . Sum result (should be 150)
        END     LOOP`
        },

        format2: {
                name: '📐 Format 2 (Register)',
                description: 'Register-to-register instructions',
                code: `FMT2    START   0         . Format 2 instructions demo
        LDA     VAL1      . Load 20 into A
        LDS     VAL2      . Load 5 into S
. Register arithmetic
        ADDR    S,A       . A = A + S = 25
        STA     ADD_RES   . Store addition result
        LDA     VAL1      . Reload 20
        SUBR    S,A       . A = A - S = 15
        STA     SUB_RES   . Store subtraction result
        LDA     VAL1
        MULR    S,A       . A = A * S = 100
        STA     MUL_RES
        LDA     VAL1
        DIVR    S,A       . A = A / S = 4
        STA     DIV_RES
. Register operations
        CLEAR   A         . A = 0
        CLEAR   X         . X = 0
        LDA     #8
        SHIFTL  A,2       . A = A << 2 = 32
        STA     SHIFT_L
        LDA     #32
        SHIFTR  A,2       . A = A >> 2 = 8
        STA     SHIFT_R
        RMO     A,S       . Copy A to S
        COMPR   A,S       . Compare registers
        RSUB
VAL1    WORD    20
VAL2    WORD    5
ADD_RES RESW    1         . 25
SUB_RES RESW    1         . 15
MUL_RES RESW    1         . 100
DIV_RES RESW    1         . 4
SHIFT_L RESW    1         . 32
SHIFT_R RESW    1         . 8
        END     FMT2`
        },

        subroutine: {
                name: '📞 Subroutine Calls',
                description: 'JSUB and RSUB usage',
                code: `MAIN    START   0         . Subroutine demo
        STL     RETADR    . Save return address
. Call subroutine to compute 5 * 2
        LDA     #5        . Load parameter
        STA     PARAM
        JSUB    DOUBLE    . Call DOUBLE subroutine
. Result is now 10, call again
        JSUB    DOUBLE    . Double again (now 20)
        LDA     PARAM     . Load final result
        STA     RESULT    . Store it
        LDL     RETADR    . Restore return address
        RSUB              . Return to OS
.
. DOUBLE: Doubles the value in PARAM
.
DOUBLE  LDA     PARAM     . Load parameter
        ADD     PARAM     . Add to itself
        STA     PARAM     . Store result
        RSUB              . Return
.
. Data area
.
RETADR  RESW    1         . Saved return address
PARAM   RESW    1         . Parameter for subroutine
RESULT  RESW    1         . Final result (should be 20)
        END     MAIN`
        },

        constants: {
                name: '📦 BYTE and WORD',
                description: 'Data constants and character strings',
                code: `CONST   START   0         . Constants demo
        LDA     DECNUM    . Load decimal 1000
        ADD     HEXNUM    . Add hex 0x100 = 256
        STA     RESULT    . Result = 1256
. Character handling
        LDCH    HELLO     . Load 'H'
        STCH    OUTPUT
        LDCH    HELLO+1   . Load 'E'
        STCH    OUTPUT+1
        LDCH    HELLO+2   . Load 'L'
        STCH    OUTPUT+2
        LDCH    HELLO+3   . Load 'L'
        STCH    OUTPUT+3
        LDCH    HELLO+4   . Load 'O'
        STCH    OUTPUT+4
        RSUB
. Data constants
DECNUM  WORD    1000      . Decimal constant
HEXNUM  BYTE    X'000100' . Hex constant (256 decimal)
HELLO   BYTE    C'HELLO'  . Character string (5 bytes)
BYTE3   BYTE    X'F1'     . Single hex byte
RESULT  RESW    1
OUTPUT  RESB    5         . Output buffer
        END     CONST`
        },

        extended: {
                name: '➕4 Extended Format',
                description: 'Format 4 with + prefix for 20-bit addresses',
                code: `EXT     START   0         . Extended format demo
        LDB     #DATA     . Load base address
        BASE    DATA      . Set base register
. Extended format instructions (4 bytes)
        +LDA    FARDATA   . Format 4: Full 20-bit address
        +STA    FAROUT    . Format 4: Store far
        +JSUB   FARSUB    . Format 4: Call far subroutine
        +J      DONE      . Format 4: Jump far
. Normal format 3 instructions
DONE    LDA     NEAR      . Format 3: PC-relative
        STA     RESULT    . Format 3: PC-relative
        RSUB
. Subroutine
FARSUB  LDA     #1
        RSUB
. Near data (within PC-relative range)
NEAR    WORD    100
RESULT  RESW    1
DATA    RESW    1
. Far data (requires extended format)
        RESB    5000      . Create distance
FARDATA WORD    999
FAROUT  RESW    1
        END     EXT`
        },

        fullDemo: {
                name: '🌟 Full Demo',
                description: 'Comprehensive example with all features',
                code: `DEMO    START   1000      . Complete SIC/XE demo
FIRST   STL     RETADR    . Save return address
        LDB     #BASE     . Load base register
        BASE    BASE      . Establish base
. Immediate addressing
        LDA     #50       . Load immediate 50
        STA     NUM1      . Store it
        LDA     #30
        STA     NUM2
. Arithmetic with format 3
        LDA     NUM1      . Load 50
        ADD     NUM2      . Add 30 = 80
        STA     SUM       . Store sum
. Register operations (format 2)
        LDS     NUM2      . Load 30 into S
        ADDR    S,A       . A = 80 + 30 = 110
        STA     TOTAL
. Indexed addressing
        LDX     #0        . Initialize index
LOOP    LDA     TABLE,X   . Load table element
        STA     OUTBUF,X  . Copy to output
        TIX     TABLEN    . Increment and test
        JLT     LOOP      . Continue if X < length
. Extended format call
        +JSUB   HELPER    . Call helper subroutine
. Indirect return
        J       @RETADR   . Return indirectly
.
. Helper subroutine
.
HELPER  LDA     TOTAL     . Load result
        ADD     #1        . Increment
        STA     TOTAL     . Store back
        RSUB              . Return
.
. Data section
.
RETADR  RESW    1         . Return address
NUM1    RESW    1         . First number
NUM2    RESW    1         . Second number
SUM     RESW    1         . Sum result
TOTAL   RESW    1         . Running total
TABLE   WORD    10        . Table data
        WORD    20
        WORD    30
TABLEN  WORD    9         . Table length (3 * 3)
OUTBUF  RESB    9         . Output buffer
BASE    EQU     *         . Base address
        END     FIRST     . First executable instruction`
        }
};

// Default example to load
export const defaultExample = 'simple';

export type ExampleProgramKey = keyof typeof examplePrograms;