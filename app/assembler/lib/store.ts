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
      const tokenizedLines = tokenize(sourceCode);
      set({
        tokenizedLines,
        currentPhase: 'lexing'
      });
    } catch (error) {
      set({
        currentPhase: 'error',
        errors: [{
          lineNumber: 0,
          message: `Lexer error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
    }

    set({ currentPhase: 'parsing' });

    try {
      const { errors, success } = parseAll(get().tokenizedLines);

      set(state => ({
        errors: [...state.errors, ...errors],
        currentPhase: success ? 'parsing' : 'error'
      }));
    } catch (error) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Parser error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
      tokenizedLines = get().tokenizedLines;
    }

    set({ currentPhase: 'pass1' });

    try {
      const pass1Result = executePass1(tokenizedLines);

      set(state => ({
        pass1Result,
        errors: [...state.errors.filter(e => e.phase !== 'pass1'), ...pass1Result.errors],
        currentPhase: pass1Result.success ? 'pass1' : 'error'
      }));
    } catch (error) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Pass 1 error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      set(state => ({
        pass2Result,
        errors: [...state.errors.filter(e => e.phase !== 'pass2'), ...pass2Result.errors],
        currentPhase: pass2Result.success ? 'pass2' : 'error'
      }));
    } catch (error) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Pass 2 error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    set({ currentPhase: 'generating' });

    try {
      const objectProgram = generateObjectProgram(pass1Result, pass2Result);

      set({
        objectProgram,
        currentPhase: 'generating'
      });
    } catch (error) {
      set(state => ({
        currentPhase: 'error',
        errors: [...state.errors, {
          lineNumber: 0,
          message: `Object program generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          type: 'error',
          phase: 'pass2'
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
          phase: 'loader'
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
          phase: 'loader'
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
