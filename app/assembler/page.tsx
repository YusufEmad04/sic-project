'use client';

/**
 * SIC/XE Assembler Simulator Page
 * 4-panel layout: Editor | Intermediate Tables | Object Program | Memory View
 */

import { AssemblyEditor } from './components/Editor';
import { Pass1Table } from './components/Pass1Table';
import { Pass2Table } from './components/Pass2Table';
import { ObjectProgramDisplay } from './components/ObjectProgram';
import { MemoryView } from './components/MemoryView';
import { InstructionBreakdown } from './components/InstructionBreakdown';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssemblerStore } from './lib/store';
import { Badge } from '@/components/ui/badge';

export default function AssemblerPage() {
  const { currentPhase, errors } = useAssemblerStore();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-2 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">SIC/XE Assembler Simulator</h1>
          <Badge variant={currentPhase === 'idle' ? 'outline' : 'default'} className="capitalize">
            {currentPhase}
          </Badge>
        </div>
        {errors.length > 0 && (
          <Badge variant="destructive">
            {errors.length} Error{errors.length > 1 ? 's' : ''}
          </Badge>
        )}
      </header>

      {/* Main Content - 4 panels */}
      <main className="flex-1 grid grid-cols-2 gap-2 p-2 overflow-hidden">
        {/* Left Column: Editor and Instruction Breakdown */}
        <div className="flex flex-col gap-2 overflow-hidden">
          {/* Editor Panel */}
          <div className="flex-2 min-h-0">
            <AssemblyEditor />
          </div>

          {/* Instruction Breakdown Panel */}
          <div className="flex-1 min-h-0 overflow-auto">
            <InstructionBreakdown />
          </div>
        </div>

        {/* Right Column: Intermediate Tables and Memory */}
        <div className="flex flex-col gap-2 overflow-hidden">
          {/* Intermediate Tables Panel */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <Tabs defaultValue="pass1" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-4 shrink-0">
                <TabsTrigger value="pass1">Pass 1</TabsTrigger>
                <TabsTrigger value="pass2">Pass 2</TabsTrigger>
                <TabsTrigger value="object">Object</TabsTrigger>
                <TabsTrigger value="memory">Memory</TabsTrigger>
              </TabsList>
              <div className="flex-1 overflow-hidden mt-2">
                <TabsContent value="pass1" className="h-full m-0 overflow-auto">
                  <Pass1Table />
                </TabsContent>
                <TabsContent value="pass2" className="h-full m-0 overflow-auto">
                  <Pass2Table />
                </TabsContent>
                <TabsContent value="object" className="h-full m-0 overflow-auto">
                  <ObjectProgramDisplay />
                </TabsContent>
                <TabsContent value="memory" className="h-full m-0 overflow-auto">
                  <MemoryView />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-1 text-xs text-muted-foreground bg-card">
        <div className="flex items-center justify-between">
          <span>SIC/XE Two-Pass Assembler with PC/BASE-relative addressing</span>
          <span>Click on table rows to see instruction breakdown</span>
        </div>
      </footer>
    </div>
  );
}
