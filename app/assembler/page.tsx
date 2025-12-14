'use client';

/**
 * SIC/XE Assembler Simulator Page
 * Resizable panels: Editor | Intermediate Tables | Object Program | Memory View
 */

import { AssemblyEditor } from './components/Editor';
import { Pass1Table } from './components/Pass1Table';
import { Pass2Table } from './components/Pass2Table';
import { ObjectProgramDisplay } from './components/ObjectProgram';
import { MemoryView } from './components/MemoryView';
import { InstructionBreakdown } from './components/InstructionBreakdown';
import { ErrorPanel } from './components/ErrorPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
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

      {/* Main Content - Resizable Panels */}
      <main className="flex-1 overflow-hidden p-2">
        <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
          {/* Left Column: Editor and Instruction Breakdown */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <ResizablePanelGroup direction="vertical">
              {/* Editor Panel */}
              <ResizablePanel defaultSize={65} minSize={20}>
                <div className="h-full p-1">
                  <AssemblyEditor />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Instruction Breakdown Panel */}
              <ResizablePanel defaultSize={35} minSize={15}>
                <div className="h-full p-1 overflow-auto">
                  <InstructionBreakdown />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Right Column: Results (Pass1, Pass2, Object, Memory) */}
          <ResizablePanel defaultSize={50} minSize={25}>
            <div className="h-full p-1">
              <Tabs defaultValue="pass1" className="h-full flex flex-col">
                <TabsList className="grid grid-cols-5 shrink-0">
                  <TabsTrigger value="pass1">Pass 1</TabsTrigger>
                  <TabsTrigger value="pass2">Pass 2</TabsTrigger>
                  <TabsTrigger value="object">Object</TabsTrigger>
                  <TabsTrigger value="memory">Memory</TabsTrigger>
                  <TabsTrigger value="errors" className="relative">
                    Errors
                    {errors.length > 0 && (
                      <span className="ml-1 bg-destructive text-destructive-foreground text-xs rounded-full px-1.5 min-w-[1.25rem] inline-flex items-center justify-center">
                        {errors.length}
                      </span>
                    )}
                  </TabsTrigger>
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
                  <TabsContent value="errors" className="h-full m-0 overflow-auto">
                    <ErrorPanel />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </main>

      {/* Footer */}
      <footer className="border-t px-4 py-1 text-xs text-muted-foreground bg-card">
        <div className="flex items-center justify-between">
          <span>SIC/XE Two-Pass Assembler with PC/BASE-relative addressing</span>
          <span>Drag the handles to resize panels</span>
        </div>
      </footer>
    </div>
  );
}
