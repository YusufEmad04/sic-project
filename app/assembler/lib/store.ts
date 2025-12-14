/**
 * SIC/XE Assembler State Store
 * Zustand store for managing assembler state across components
 */

import { create } from 'zustand';
import { AssemblerState } from './types';
import { tokenize } from './lexer';
import { parseAll } from './parser';
import { executePass1 } from './sicxePass1';
import { executePass2 } from './sicxePass2';
import { generateObjectProgram } from './objectProgram';
import { loadObjectProgram, SIC_MEMORY_SIZE } from './memoryLoader';
import { examplePrograms, defaultExample } from '../examples/programs';

interface AssemblerActions {
  // Source code
  setSourceCode: (code: string) => void;

  // Assembly process
  runLexer: () => void;
  runParser: () => void;
  runPass1: () => void;
  runPass2: () => void;
  generateProgram: () => void;
  loadIntoMemory: () => void;
  assemble: () => void; // Run all steps
  reset: () => void;

  // UI state
  selectLine: (lineNumber: number | null) => void;
  selectMemoryAddress: (address: number | null) => void;
}

type AssemblerStore = AssemblerState & AssemblerActions;

// Load default example program
const defaultCode = examplePrograms[defaultExample].code;

const initialState: AssemblerState = {
  sourceCode: defaultCode,
  currentPhase: 'idle',
  tokenizedLines: [],
  pass1Result: null,
  pass2Result: null,
  objectProgram: null,
  memory: null,
  errors: [],
  selectedLineNumber: null,
  selectedMemoryAddress: null
};

export const useAssemblerStore = create<AssemblerStore>((set, get) => ({
  ...initialState,

  setSourceCode: (code: string) => {
    set({
      sourceCode: code,
      currentPhase: 'idle',
      tokenizedLines: [],
      pass1Result: null,
      pass2Result: null,
      objectProgram: null,
      memory: null,
      errors: []
    });
  },

  runLexer: () => {
    const { sourceCode } = get();
    set({ currentPhase: 'lexing', errors: [] });

    try {
      // Validate source code
      if (!sourceCode || sourceCode.trim().length === 0) {
        set({
          currentPhase: 'error',
          errors: [{
            lineNumber: 0,
            message: 'Source code is empty. Please enter some SIC/XE assembly code.',
            type: 'error',
            phase: 'lexer'
          }]
        });
        return;
      }

      const tokenizedLines = tokenize(sourceCode);

      // Check if we got any non-empty/non-comment lines
      const codeLines = tokenizedLines.filter(l => !l.isEmpty && !l.isComment);
      if (codeLines.length === 0) {
        set({
          currentPhase: 'error',
          errors: [{
            lineNumber: 0,
            message: 'No executable code found. The source contains only comments or empty lines.',
            type: 'error',
            phase: 'lexer'
          }]
        });
        return;
      }

      set({
        tokenizedLines,
        currentPhase: 'lexing'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;

      console.error('Lexer error:', errorMessage, errorStack);

      set({
        currentPhase: 'error',
        errors: [{
          lineNumber: 0,
          message: `Lexer error: ${errorMessage}`,
          type: 'error',
          phase: 'lexer'
        }]
      });
    }
  },

  runParser: () => {
    const { tokenizedLines } = get();

    if (tokenizedLines.length === 0) {
      get().runLexer();
      // Check if lexer failed
      if (get().currentPhase === 'error') {
        return;
      }
    }

    set({ currentPhase: 'parsing' });

    try {
      const currentLines = get().tokenizedLines;
      if (currentLines.length === 0) {
        set(state => ({
          currentPhase: 'error',
          errors: [...state.errors, {
            lineNumber: 0,
            message: 'No lines to parse. Lexer may have failed.',
            type: 'error',
            phase: 'parser'
          }]
        }));
        return;
      }

      const { errors, success } = parseAll(currentLines);

      set(state => ({
        errors: [...state.errors, ...errors],
        currentPhase: success ? 'parsing' : 'error'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Parser error:', errorMessage, error instanceof Error ? error.stack : '');

      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Parser error: ${errorMessage}`,
          type: 'error',
          phase: 'parser'
        }]
      }));
    }
  },

  runPass1: () => {
    let { tokenizedLines } = get();

    // Run lexer if needed
    if (tokenizedLines.length === 0) {
      get().runLexer();
      // Check if lexer failed
      if (get().currentPhase === 'error') {
        return;
      }
      tokenizedLines = get().tokenizedLines;
    }

    set({ currentPhase: 'pass1' });

    try {
      if (tokenizedLines.length === 0) {
        set(state => ({
          currentPhase: 'error',
          errors: [...state.errors, {
            lineNumber: 0,
            message: 'No lines to process in Pass 1. Check source code.',
            type: 'error',
            phase: 'pass1'
          }]
        }));
        return;
      }

      const pass1Result = executePass1(tokenizedLines);

      // Log pass1 result for debugging
      console.log('Pass 1 completed:', {
        symbolCount: Object.keys(pass1Result.symbolTable).length,
        programName: pass1Result.programName,
        startAddress: pass1Result.startAddress.toString(16),
        programLength: pass1Result.programLength,
        errorCount: pass1Result.errors.length,
        success: pass1Result.success
      });

      set(state => ({
        pass1Result,
        errors: [...state.errors.filter(e => e.phase !== 'pass1'), ...pass1Result.errors],
        currentPhase: pass1Result.success ? 'pass1' : 'error'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Pass 1 error:', errorMessage, error instanceof Error ? error.stack : '');

      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Pass 1 internal error: ${errorMessage}`,
          type: 'error',
          phase: 'pass1'
        }]
      }));
    }
  },

  runPass2: () => {
    let { pass1Result } = get();

    // Run Pass 1 if needed
    if (!pass1Result) {
      get().runPass1();
      pass1Result = get().pass1Result;
    }

    if (!pass1Result || !pass1Result.success) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: 'Cannot run Pass 2: Pass 1 failed or not completed',
          type: 'error',
          phase: 'pass2'
        }]
      }));
      return;
    }

    set({ currentPhase: 'pass2' });

    try {
      const pass2Result = executePass2(pass1Result);

      // Log pass2 result for debugging
      console.log('Pass 2 completed:', {
        entryCount: pass2Result.entries.length,
        errorCount: pass2Result.errors.length,
        baseRegister: pass2Result.baseRegister?.toString(16) ?? 'not set',
        success: pass2Result.success
      });

      set(state => ({
        pass2Result,
        errors: [...state.errors.filter(e => e.phase !== 'pass2'), ...pass2Result.errors],
        currentPhase: pass2Result.success ? 'pass2' : 'error'
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Pass 2 error:', errorMessage, error instanceof Error ? error.stack : '');

      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Pass 2 internal error: ${errorMessage}`,
          type: 'error',
          phase: 'pass2'
        }]
      }));
    }
  },

  generateProgram: () => {
    const { pass1Result, pass2Result } = get();

    if (!pass1Result || !pass2Result) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: 'Cannot generate object program: Pass 1 or Pass 2 not completed',
          type: 'error',
          phase: 'pass2'
        }]
      }));
      return;
    }

    if (!pass2Result.success) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: 'Cannot generate object program: Pass 2 completed with errors',
          type: 'error',
          phase: 'pass2'
        }]
      }));
      return;
    }

    set({ currentPhase: 'generating' });

    try {
      const objectProgram = generateObjectProgram(pass1Result, pass2Result);

      console.log('Object program generated:', {
        programName: objectProgram.programName,
        startAddress: objectProgram.startAddress.toString(16),
        programLength: objectProgram.programLength,
        textRecordCount: objectProgram.textRecords.length,
        modRecordCount: objectProgram.modificationRecords.length
      });

      set({
        objectProgram,
        currentPhase: 'generating'
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Object program generation error:', errorMessage, error instanceof Error ? error.stack : '');

      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Object program generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
          phase: 'objectgen',
          details: 'An error occurred while creating the object program from Pass 2 output. This is usually an internal error.'
        }]
      }));
    }
  },

  loadIntoMemory: () => {
    const { objectProgram, pass2Result } = get();

    if (!objectProgram) {
      get().generateProgram();
    }

    const program = get().objectProgram;
    if (!program) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: 'Cannot load into memory: No object program generated',
          type: 'error',
          phase: 'loader',
          details: 'The object program must be successfully generated before it can be loaded into memory.'
        }]
      }));
      return;
    }

    set({ currentPhase: 'loading' });

    try {
      const memory = loadObjectProgram(program, pass2Result || undefined, SIC_MEMORY_SIZE);

      set({
        memory,
        currentPhase: 'complete'
      });
    } catch (error) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Memory loading error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
          phase: 'loader',
          details: 'An error occurred while loading the object program into simulated memory.'
        }]
      }));
    }
  },

  assemble: () => {
    const state = get();

    // Reset errors and set initial phase
    set({ errors: [], currentPhase: 'lexing' });

    // Use microtask to allow UI to update between phases
    const runAsync = async () => {
      // Run lexer
      state.runLexer();
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      if (get().currentPhase === 'error') return;

      // Run parser
      state.runParser();
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      // Check for parser errors (only stop on actual errors, not warnings)
      const parserErrors = get().errors.filter(e => e.phase === 'parser' && e.type === 'error');
      if (parserErrors.length > 0) {
        set({ currentPhase: 'error' });
        return;
      }

      // Run Pass 1
      state.runPass1();
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      if (get().currentPhase === 'error' || !get().pass1Result?.success) return;

      // Run Pass 2
      state.runPass2();
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      if (get().currentPhase === 'error' || !get().pass2Result?.success) return;

      // Generate program
      state.generateProgram();
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI

      if (get().currentPhase === 'error') return;

      // Load into memory
      state.loadIntoMemory();
    };

    runAsync();
  },

  reset: () => {
    set({
      ...initialState,
      sourceCode: get().sourceCode // Keep source code
    });
  },

  selectLine: (lineNumber: number | null) => {
    set({ selectedLineNumber: lineNumber });
  },

  selectMemoryAddress: (address: number | null) => {
    set({ selectedMemoryAddress: address });
  }
}));

// Selector hooks for specific parts of state
export const useSourceCode = () => useAssemblerStore(state => state.sourceCode);
export const useCurrentPhase = () => useAssemblerStore(state => state.currentPhase);
export const usePass1Result = () => useAssemblerStore(state => state.pass1Result);
export const usePass2Result = () => useAssemblerStore(state => state.pass2Result);
export const useObjectProgram = () => useAssemblerStore(state => state.objectProgram);
export const useMemory = () => useAssemblerStore(state => state.memory);
export const useErrors = () => useAssemblerStore(state => state.errors);
export const useSelectedLine = () => useAssemblerStore(state => state.selectedLineNumber);
export const useSelectedMemoryAddress = () => useAssemblerStore(state => state.selectedMemoryAddress);
