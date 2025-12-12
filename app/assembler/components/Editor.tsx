'use client';

/**
 * Monaco Code Editor for SIC/XE Assembly
 * With full IntelliSense support for autocomplete
 */

import { useCallback, useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssemblerStore } from '../lib/store';
import { Play, RotateCcw, StepForward, Loader2, ChevronDown } from 'lucide-react';
import { examplePrograms, ExampleProgramKey } from '../examples/programs';

// SIC/XE language definitions for syntax highlighting and IntelliSense
const sicxeLanguageConfig = {
  // Assembler directives
  directives: [
    { name: 'START', doc: 'Specify name and starting address for program', snippet: 'START\t${1:0}' },
    { name: 'END', doc: 'Indicate end of source program and (optionally) specify first executable instruction', snippet: 'END\t${1:FIRST}' },
    { name: 'BYTE', doc: 'Generate character or hexadecimal constant', snippet: 'BYTE\t${1|C\'text\',X\'hex\'|}' },
    { name: 'WORD', doc: 'Generate one-word integer constant (3 bytes)', snippet: 'WORD\t${1:0}' },
    { name: 'RESB', doc: 'Reserve indicated number of bytes for data area', snippet: 'RESB\t${1:1}' },
    { name: 'RESW', doc: 'Reserve indicated number of words for data area', snippet: 'RESW\t${1:1}' },
    { name: 'BASE', doc: 'Inform assembler that base register is ready for base-relative addressing', snippet: 'BASE\t${1:label}' },
    { name: 'NOBASE', doc: 'Inform assembler that base register is no longer available', snippet: 'NOBASE' },
    { name: 'EQU', doc: 'Define symbol with specified value', snippet: 'EQU\t${1:*}' },
    { name: 'ORG', doc: 'Reset location counter to specified value', snippet: 'ORG\t${1:address}' },
    { name: 'LTORG', doc: 'Generate literal pool at current location', snippet: 'LTORG' },
  ],

  // Format 1 instructions (1 byte, no operands)
  format1: [
    { name: 'FIX', doc: 'Convert floating to integer (A ← (A) as integer)', opcode: 'C4' },
    { name: 'FLOAT', doc: 'Convert integer to floating (F ← (A) as float)', opcode: 'C0' },
    { name: 'HIO', doc: 'Halt I/O channel number (A)', opcode: 'F4' },
    { name: 'NORM', doc: 'Normalize (F)', opcode: 'C8' },
    { name: 'SIO', doc: 'Start I/O channel number (A); address of channel program in S', opcode: 'F0' },
    { name: 'TIO', doc: 'Test I/O channel number (A)', opcode: 'F8' },
  ],

  // Format 2 instructions (2 bytes, register operands)
  format2: [
    { name: 'ADDR', doc: 'Add register: r2 ← (r2) + (r1)', snippet: 'ADDR\t${1|A,X,L,B,S,T|},${2|A,X,L,B,S,T|}', opcode: '90' },
    { name: 'CLEAR', doc: 'Clear register: r1 ← 0', snippet: 'CLEAR\t${1|A,X,L,B,S,T|}', opcode: 'B4' },
    { name: 'COMPR', doc: 'Compare registers: (r1) : (r2)', snippet: 'COMPR\t${1|A,X,L,B,S,T|},${2|A,X,L,B,S,T|}', opcode: 'A0' },
    { name: 'DIVR', doc: 'Divide register: r2 ← (r2) / (r1)', snippet: 'DIVR\t${1|A,X,L,B,S,T|},${2|A,X,L,B,S,T|}', opcode: '9C' },
    { name: 'MULR', doc: 'Multiply register: r2 ← (r2) * (r1)', snippet: 'MULR\t${1|A,X,L,B,S,T|},${2|A,X,L,B,S,T|}', opcode: '98' },
    { name: 'RMO', doc: 'Register move: r2 ← (r1)', snippet: 'RMO\t${1|A,X,L,B,S,T|},${2|A,X,L,B,S,T|}', opcode: 'AC' },
    { name: 'SHIFTL', doc: 'Shift left: r1 ← (r1) left circular n bits', snippet: 'SHIFTL\t${1|A,X,L,B,S,T|},${2:n}', opcode: 'A4' },
    { name: 'SHIFTR', doc: 'Shift right: r1 ← (r1) right n bits with sign extension', snippet: 'SHIFTR\t${1|A,X,L,B,S,T|},${2:n}', opcode: 'A8' },
    { name: 'SUBR', doc: 'Subtract register: r2 ← (r2) - (r1)', snippet: 'SUBR\t${1|A,X,L,B,S,T|},${2|A,X,L,B,S,T|}', opcode: '94' },
    { name: 'SVC', doc: 'Supervisor call; generate SVC interrupt', snippet: 'SVC\t${1:n}', opcode: 'B0' },
    { name: 'TIXR', doc: 'Test and increment index register: X ← (X) + 1; (X) : (r1)', snippet: 'TIXR\t${1|A,X,L,B,S,T|}', opcode: 'B8' },
  ],

  // Format 3/4 instructions (3 or 4 bytes, memory operands)
  format34: [
    { name: 'ADD', doc: 'Add to accumulator: A ← (A) + (m..m+2)', snippet: 'ADD\t${1:operand}', opcode: '18' },
    { name: 'ADDF', doc: 'Add floating: F ← (F) + (m..m+5)', snippet: 'ADDF\t${1:operand}', opcode: '58' },
    { name: 'AND', doc: 'AND to accumulator: A ← (A) AND (m..m+2)', snippet: 'AND\t${1:operand}', opcode: '40' },
    { name: 'COMP', doc: 'Compare accumulator with memory: (A) : (m..m+2)', snippet: 'COMP\t${1:operand}', opcode: '28' },
    { name: 'COMPF', doc: 'Compare floating: (F) : (m..m+5)', snippet: 'COMPF\t${1:operand}', opcode: '88' },
    { name: 'DIV', doc: 'Divide accumulator: A ← (A) / (m..m+2)', snippet: 'DIV\t${1:operand}', opcode: '24' },
    { name: 'DIVF', doc: 'Divide floating: F ← (F) / (m..m+5)', snippet: 'DIVF\t${1:operand}', opcode: '64' },
    { name: 'J', doc: 'Unconditional jump: PC ← m', snippet: 'J\t${1:label}', opcode: '3C' },
    { name: 'JEQ', doc: 'Jump if equal: PC ← m if CC = "="', snippet: 'JEQ\t${1:label}', opcode: '30' },
    { name: 'JGT', doc: 'Jump if greater: PC ← m if CC = ">"', snippet: 'JGT\t${1:label}', opcode: '34' },
    { name: 'JLT', doc: 'Jump if less: PC ← m if CC = "<"', snippet: 'JLT\t${1:label}', opcode: '38' },
    { name: 'JSUB', doc: 'Jump to subroutine: L ← (PC); PC ← m', snippet: 'JSUB\t${1:label}', opcode: '48' },
    { name: 'LDA', doc: 'Load accumulator: A ← (m..m+2)', snippet: 'LDA\t${1:operand}', opcode: '00' },
    { name: 'LDB', doc: 'Load base register: B ← (m..m+2)', snippet: 'LDB\t${1:operand}', opcode: '68' },
    { name: 'LDCH', doc: 'Load character: A[rightmost byte] ← (m)', snippet: 'LDCH\t${1:operand}', opcode: '50' },
    { name: 'LDF', doc: 'Load floating: F ← (m..m+5)', snippet: 'LDF\t${1:operand}', opcode: '70' },
    { name: 'LDL', doc: 'Load linkage register: L ← (m..m+2)', snippet: 'LDL\t${1:operand}', opcode: '08' },
    { name: 'LDS', doc: 'Load S register: S ← (m..m+2)', snippet: 'LDS\t${1:operand}', opcode: '6C' },
    { name: 'LDT', doc: 'Load T register: T ← (m..m+2)', snippet: 'LDT\t${1:operand}', opcode: '74' },
    { name: 'LDX', doc: 'Load index register: X ← (m..m+2)', snippet: 'LDX\t${1:operand}', opcode: '04' },
    { name: 'LPS', doc: 'Load processor status from memory', snippet: 'LPS\t${1:operand}', opcode: 'D0' },
    { name: 'MUL', doc: 'Multiply accumulator: A ← (A) * (m..m+2)', snippet: 'MUL\t${1:operand}', opcode: '20' },
    { name: 'MULF', doc: 'Multiply floating: F ← (F) * (m..m+5)', snippet: 'MULF\t${1:operand}', opcode: '60' },
    { name: 'OR', doc: 'OR to accumulator: A ← (A) OR (m..m+2)', snippet: 'OR\t${1:operand}', opcode: '44' },
    { name: 'RD', doc: 'Read data from device: A[rightmost byte] ← data', snippet: 'RD\t${1:device}', opcode: 'D8' },
    { name: 'RSUB', doc: 'Return from subroutine: PC ← (L)', snippet: 'RSUB', opcode: '4C' },
    { name: 'SSK', doc: 'Set storage key from accumulator', snippet: 'SSK\t${1:operand}', opcode: 'EC' },
    { name: 'STA', doc: 'Store accumulator: m..m+2 ← (A)', snippet: 'STA\t${1:operand}', opcode: '0C' },
    { name: 'STB', doc: 'Store base register: m..m+2 ← (B)', snippet: 'STB\t${1:operand}', opcode: '78' },
    { name: 'STCH', doc: 'Store character: m ← (A)[rightmost byte]', snippet: 'STCH\t${1:operand}', opcode: '54' },
    { name: 'STF', doc: 'Store floating: m..m+5 ← (F)', snippet: 'STF\t${1:operand}', opcode: '80' },
    { name: 'STI', doc: 'Store interval timer: m..m+2 ← interval timer', snippet: 'STI\t${1:operand}', opcode: 'D4' },
    { name: 'STL', doc: 'Store linkage register: m..m+2 ← (L)', snippet: 'STL\t${1:operand}', opcode: '14' },
    { name: 'STS', doc: 'Store S register: m..m+2 ← (S)', snippet: 'STS\t${1:operand}', opcode: '7C' },
    { name: 'STSW', doc: 'Store status word: m..m+2 ← (SW)', snippet: 'STSW\t${1:operand}', opcode: 'E8' },
    { name: 'STT', doc: 'Store T register: m..m+2 ← (T)', snippet: 'STT\t${1:operand}', opcode: '84' },
    { name: 'STX', doc: 'Store index register: m..m+2 ← (X)', snippet: 'STX\t${1:operand}', opcode: '10' },
    { name: 'SUB', doc: 'Subtract from accumulator: A ← (A) - (m..m+2)', snippet: 'SUB\t${1:operand}', opcode: '1C' },
    { name: 'SUBF', doc: 'Subtract floating: F ← (F) - (m..m+5)', snippet: 'SUBF\t${1:operand}', opcode: '5C' },
    { name: 'TD', doc: 'Test device: CC ← test device', snippet: 'TD\t${1:device}', opcode: 'E0' },
    { name: 'TIX', doc: 'Test and increment index: X ← (X) + 1; (X) : (m..m+2)', snippet: 'TIX\t${1:operand}', opcode: '2C' },
    { name: 'WD', doc: 'Write data to device: device ← (A)[rightmost byte]', snippet: 'WD\t${1:device}', opcode: 'DC' },
  ],

  // Registers
  registers: [
    { name: 'A', doc: 'Accumulator (24-bit) - used for arithmetic operations', code: '0' },
    { name: 'X', doc: 'Index register (24-bit) - used for indexed addressing', code: '1' },
    { name: 'L', doc: 'Linkage register (24-bit) - stores return address for JSUB', code: '2' },
    { name: 'B', doc: 'Base register (24-bit) - used for base-relative addressing', code: '3' },
    { name: 'S', doc: 'General purpose register (24-bit)', code: '4' },
    { name: 'T', doc: 'General purpose register (24-bit)', code: '5' },
    { name: 'F', doc: 'Floating-point accumulator (48-bit)', code: '6' },
    { name: 'PC', doc: 'Program counter (24-bit) - address of next instruction', code: '8' },
    { name: 'SW', doc: 'Status word - includes condition code (CC)', code: '9' },
  ],

  // Addressing mode prefixes for documentation
  addressingModes: [
    { prefix: '#', doc: 'Immediate addressing - operand is the value itself (n=0, i=1)' },
    { prefix: '@', doc: 'Indirect addressing - operand is address of address (n=1, i=0)' },
    { prefix: '+', doc: 'Extended format (Format 4) - uses 20-bit address field (e=1)' },
    { suffix: ',X', doc: 'Indexed addressing - adds X register to address (x=1)' },
  ]
};

export function AssemblyEditor() {
  const {
    sourceCode,
    setSourceCode,
    assemble,
    reset,
    runPass1,
    runPass2,
    currentPhase,
    errors
  } = useAssemblerStore();

  const [showExamples, setShowExamples] = useState(false);

  const handleEditorChange = useCallback((value: string | undefined) => {
    if (value !== undefined) {
      setSourceCode(value);
    }
  }, [setSourceCode]);

  const handleLoadExample = useCallback((key: ExampleProgramKey) => {
    setSourceCode(examplePrograms[key].code);
    reset();
    setShowExamples(false);
  }, [setSourceCode, reset]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorMount = useCallback((editor: any, monaco: any) => {
    // Register SIC/XE language
    monaco.languages.register({ id: 'sicxe' });

    // Set tokenization rules using Monarch
    monaco.languages.setMonarchTokensProvider('sicxe', {
      ignoreCase: true,
      keywords: sicxeLanguageConfig.directives.map(d => d.name),
      instructions: [
        ...sicxeLanguageConfig.format1.map(i => i.name),
        ...sicxeLanguageConfig.format2.map(i => i.name),
        ...sicxeLanguageConfig.format34.map(i => i.name),
      ],
      registers: sicxeLanguageConfig.registers.map(r => r.name),

      tokenizer: {
        root: [
          // Comments (starting with .)
          [/\..*$/, 'comment'],

          // Extended format prefix
          [/\+/, 'keyword.operator'],

          // Addressing mode prefixes
          [/#/, 'keyword.operator'],
          [/@/, 'keyword.operator'],

          // Hex constants
          [/X'[0-9A-Fa-f]+'/, 'string'],

          // Character constants
          [/C'[^']+'/, 'string'],

          // Numbers
          [/\b[0-9]+\b/, 'number'],

          // Registers
          [/\b(A|X|L|B|S|T|F|PC|SW)\b/i, 'variable.predefined'],

          // Instructions and keywords (check against list)
          [/\b[A-Za-z][A-Za-z0-9]*\b/, {
            cases: {
              '@keywords': 'keyword',
              '@instructions': 'keyword.instruction',
              '@default': 'identifier'
            }
          }],

          // Whitespace
          [/\s+/, 'white'],

          // Indexed addressing
          [/,/, 'delimiter'],
        ]
      }
    });

    // Register Completion Item Provider for IntelliSense
    monaco.languages.registerCompletionItemProvider('sicxe', {
      triggerCharacters: ['+', '#', '@', '\t', ' '],

      provideCompletionItems: (model: unknown, position: { lineNumber: number; column: number }) => {
        const typedModel = model as { getWordUntilPosition: (pos: { lineNumber: number; column: number }) => { word: string; startColumn: number; endColumn: number }; getLineContent: (line: number) => string };
        const word = typedModel.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const lineContent = typedModel.getLineContent(position.lineNumber);
        const beforeCursor = lineContent.substring(0, position.column - 1).toUpperCase();

        // Determine context: is this first column (label), second column (opcode), or third column (operand)?
        const parts = beforeCursor.trimStart().split(/\s+/);
        const isFirstColumn = parts.length <= 1 && !beforeCursor.match(/^\s/);
        const isSecondColumn = parts.length === 1 && beforeCursor.match(/^\s/) || parts.length === 2;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suggestions: any[] = [];

        // Add directives (always useful as opcodes)
        if (isFirstColumn || isSecondColumn || parts.length <= 2) {
          sicxeLanguageConfig.directives.forEach(dir => {
            suggestions.push({
              label: dir.name,
              kind: monaco.languages.CompletionItemKind.Keyword,
              documentation: { value: `**${dir.name}** (Directive)\n\n${dir.doc}` },
              insertText: dir.snippet || dir.name,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              range: range,
              sortText: '0' + dir.name // Sort directives first
            });
          });
        }

        // Add Format 1 instructions
        sicxeLanguageConfig.format1.forEach(instr => {
          suggestions.push({
            label: instr.name,
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: { value: `**${instr.name}** (Format 1, Opcode: ${instr.opcode})\n\n${instr.doc}\n\n_No operands required_` },
            insertText: instr.name,
            range: range,
            detail: 'Format 1 (1 byte)',
            sortText: '1' + instr.name
          });
        });

        // Add Format 2 instructions
        sicxeLanguageConfig.format2.forEach(instr => {
          suggestions.push({
            label: instr.name,
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: { value: `**${instr.name}** (Format 2, Opcode: ${instr.opcode})\n\n${instr.doc}\n\n_Register operands_` },
            insertText: instr.snippet || instr.name,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            detail: 'Format 2 (2 bytes)',
            sortText: '2' + instr.name
          });
        });

        // Add Format 3/4 instructions
        sicxeLanguageConfig.format34.forEach(instr => {
          suggestions.push({
            label: instr.name,
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: { value: `**${instr.name}** (Format 3/4, Opcode: ${instr.opcode})\n\n${instr.doc}\n\n_Use + prefix for Format 4 (extended)_` },
            insertText: instr.snippet || instr.name,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            detail: 'Format 3/4',
            sortText: '3' + instr.name
          });

          // Also add +INSTRUCTION variant for Format 4
          suggestions.push({
            label: '+' + instr.name,
            kind: monaco.languages.CompletionItemKind.Function,
            documentation: { value: `**+${instr.name}** (Format 4 - Extended)\n\n${instr.doc}\n\n_20-bit address field, always uses direct addressing_` },
            insertText: '+' + (instr.snippet || instr.name),
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range: range,
            detail: 'Format 4 (4 bytes)',
            sortText: '4' + instr.name
          });
        });

        // Add registers (for Format 2 operands)
        sicxeLanguageConfig.registers.forEach(reg => {
          suggestions.push({
            label: reg.name,
            kind: monaco.languages.CompletionItemKind.Variable,
            documentation: { value: `**${reg.name}** (Register, Code: ${reg.code})\n\n${reg.doc}` },
            insertText: reg.name,
            range: range,
            detail: `Register ${reg.code}`,
            sortText: '5' + reg.name
          });
        });

        // Add addressing mode prefixes as snippets
        suggestions.push({
          label: '#value',
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: { value: '**Immediate Addressing**\n\nThe operand value is used directly, not as an address.\n\nExample: `LDA #100` loads the value 100 into A.' },
          insertText: '#${1:value}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
          detail: 'Immediate mode (n=0, i=1)',
          sortText: '6immediate'
        });

        suggestions.push({
          label: '@address',
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: { value: '**Indirect Addressing**\n\nThe operand specifies the address of the address.\n\nExample: `J @RETADR` jumps to the address stored at RETADR.' },
          insertText: '@${1:address}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
          detail: 'Indirect mode (n=1, i=0)',
          sortText: '6indirect'
        });

        suggestions.push({
          label: 'label,X',
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: { value: '**Indexed Addressing**\n\nAdds the X register value to the address.\n\nExample: `LDA TABLE,X` loads from address TABLE+(X).' },
          insertText: '${1:label},X',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range: range,
          detail: 'Indexed mode (x=1)',
          sortText: '6indexed'
        });

        return { suggestions };
      }
    });

    // Register Hover Provider for documentation on hover
    monaco.languages.registerHoverProvider('sicxe', {
      provideHover: (model: unknown, position: { lineNumber: number; column: number }) => {
        const typedModel = model as { getWordAtPosition: (pos: { lineNumber: number; column: number }) => { word: string; startColumn: number; endColumn: number } | null };
        const word = typedModel.getWordAtPosition(position);
        if (!word) return null;

        const upperWord = word.word.toUpperCase();

        // Check directives
        const directive = sicxeLanguageConfig.directives.find(d => d.name === upperWord);
        if (directive) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${directive.name}** (Assembler Directive)` },
              { value: directive.doc }
            ]
          };
        }

        // Check Format 1 instructions
        const f1 = sicxeLanguageConfig.format1.find(i => i.name === upperWord);
        if (f1) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${f1.name}** (Format 1, Opcode: 0x${f1.opcode})` },
              { value: f1.doc },
              { value: '_1 byte instruction, no operands_' }
            ]
          };
        }

        // Check Format 2 instructions
        const f2 = sicxeLanguageConfig.format2.find(i => i.name === upperWord);
        if (f2) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${f2.name}** (Format 2, Opcode: 0x${f2.opcode})` },
              { value: f2.doc },
              { value: '_2 byte instruction, register operands_' }
            ]
          };
        }

        // Check Format 3/4 instructions
        const f34 = sicxeLanguageConfig.format34.find(i => i.name === upperWord);
        if (f34) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${f34.name}** (Format 3/4, Opcode: 0x${f34.opcode})` },
              { value: f34.doc },
              { value: '_3 bytes (Format 3) or 4 bytes with + prefix (Format 4)_' }
            ]
          };
        }

        // Check registers
        const reg = sicxeLanguageConfig.registers.find(r => r.name === upperWord);
        if (reg) {
          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**${reg.name}** (Register, Code: ${reg.code})` },
              { value: reg.doc }
            ]
          };
        }

        return null;
      }
    });

    // Define theme colors
    monaco.editor.defineTheme('sicxe-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'keyword.instruction', foreground: '569CD6' },
        { token: 'keyword.operator', foreground: 'D4D4D4' },
        { token: 'variable.predefined', foreground: '9CDCFE' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'comment', foreground: '6A9955' },
        { token: 'identifier', foreground: 'DCDCAA' },
      ],
      colors: {}
    });

    monaco.editor.setTheme('sicxe-dark');
  }, []);

  // Only show processing spinner during active assembly (lexing/parsing/generating/loading phases)
  // Individual pass results (pass1, pass2) are completed states, not processing states
  const processingPhases = ['lexing', 'parsing', 'generating', 'loading'];
  const isProcessing = processingPhases.includes(currentPhase);
  const hasErrors = errors.some(e => e.type === 'error');

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Assembly Input</CardTitle>
          <div className="flex gap-2">
            {/* Example Programs Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExamples(!showExamples)}
              >
                Examples
                <ChevronDown className="w-4 h-4 ml-1" />
              </Button>
              {showExamples && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-popover border rounded-md shadow-lg z-50">
                  {Object.entries(examplePrograms).map(([key, program]) => (
                    <button
                      key={key}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground first:rounded-t-md last:rounded-b-md"
                      onClick={() => handleLoadExample(key as ExampleProgramKey)}
                    >
                      <div className="font-medium">{program.name}</div>
                      <div className="text-xs text-muted-foreground">{program.description}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runPass1}
              disabled={isProcessing || !sourceCode}
            >
              <StepForward className="w-4 h-4 mr-1" />
              Pass 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runPass2}
              disabled={isProcessing || !sourceCode}
            >
              <StepForward className="w-4 h-4 mr-1" />
              Pass 2
            </Button>
            <Button
              onClick={assemble}
              disabled={isProcessing || !sourceCode}
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              Assemble
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              disabled={isProcessing}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <Editor
          height="100%"
          defaultLanguage="sicxe"
          value={sourceCode}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 8,
            wordWrap: 'off',
            renderWhitespace: 'selection',
            // IntelliSense options
            wordBasedSuggestions: 'off', // Disable word-based suggestions, show only our custom completions
            suggestOnTriggerCharacters: true, // Enable suggestions on trigger characters (+, #, @)
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
              showVariables: true,
              insertMode: 'insert',
              filterGraceful: true,
              localityBonus: true,
            },
            acceptSuggestionOnEnter: 'on',
            snippetSuggestions: 'inline',
            parameterHints: { enabled: true },
          }}
          theme="vs-dark"
        />
      </CardContent>
      {hasErrors && (
        <div className="p-2 bg-destructive/10 border-t border-destructive/20">
          <p className="text-sm text-destructive">
            {errors.filter(e => e.type === 'error').length} error(s) found
          </p>
        </div>
      )}
    </Card>
  );
}
