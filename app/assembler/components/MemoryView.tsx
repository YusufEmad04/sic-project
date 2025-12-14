'use client';

/**
 * Memory View Component
 * Displays memory as a grid of bytes with color coding and hover details
 */

import { useMemo } from 'react';
import { Grid, type CellComponentProps } from 'react-window';
import { useAssemblerStore } from '../lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getByteMetadata, formatByteHex, formatByteAscii, formatAddress } from '../lib/memoryLoader';
import { MemoryByteType, Memory } from '../lib/types';

const BYTES_PER_ROW = 16;
const CELL_SIZE = 28;
const ADDRESS_COLUMN_WIDTH = 60;

function getByteColor(type: MemoryByteType): string {
  switch (type) {
    case 'code':
      return 'bg-blue-500/30 hover:bg-blue-500/50 text-blue-100 dark:text-blue-200';
    case 'data':
      return 'bg-green-500/30 hover:bg-green-500/50 text-green-100 dark:text-green-200';
    case 'reserved':
      return 'bg-yellow-500/20 hover:bg-yellow-500/40 text-yellow-100 dark:text-yellow-200';
    case 'modified':
      return 'bg-purple-500/30 hover:bg-purple-500/50 text-purple-100 dark:text-purple-200';
    case 'empty':
    default:
      return 'bg-muted/30 hover:bg-muted/50 text-foreground';
  }
}

interface CellProps {
  memory: Memory;
  visibleStart: number;
  selectedMemoryAddress: number | null;
  selectMemoryAddress: (address: number | null) => void;
}

function CellComponent({
  columnIndex,
  rowIndex,
  style,
  memory,
  visibleStart,
  selectedMemoryAddress,
  selectMemoryAddress
}: CellComponentProps<CellProps>) {
  const baseAddress = visibleStart + (rowIndex * BYTES_PER_ROW);

  // First column is address
  if (columnIndex === 0) {
    return (
      <div
        style={style}
        className="flex items-center justify-end pr-2 font-mono text-xs text-muted-foreground border-r"
      >
        {formatAddress(baseAddress, 4)}:
      </div>
    );
  }

  const byteIndex = columnIndex - 1;
  const address = baseAddress + byteIndex;

  if (address >= memory.bytes.length) {
    return <div style={style} />;
  }

  const metadata = getByteMetadata(memory, address);
  const isSelected = selectedMemoryAddress === address;
  const colorClass = getByteColor(metadata.type);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div
            style={style}
            className={`flex items-center justify-center font-mono text-xs cursor-pointer border border-transparent ${colorClass} ${isSelected ? 'ring-2 ring-primary' : ''}`}
            onClick={() => selectMemoryAddress(address)}
          >
            {formatByteHex(metadata.value)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="font-mono text-xs bg-popover text-popover-foreground">
          <div className="space-y-1">
            <div>Address: <span className="text-blue-400 font-semibold">{formatAddress(address, 6)}</span></div>
            <div>Hex: <span className="text-green-400 font-semibold">{formatByteHex(metadata.value)}</span></div>
            <div>Decimal: <span className="text-yellow-400 font-semibold">{metadata.value}</span></div>
            <div>ASCII: <span className="text-purple-400 font-semibold">{formatByteAscii(metadata.value)}</span></div>
            <div>Type: <span className="text-cyan-400 font-semibold">{metadata.type}</span></div>
            {metadata.sourceLineNumber && (
              <div>Source Line: <span className="text-orange-400 font-semibold">{metadata.sourceLineNumber}</span></div>
            )}
            {metadata.instruction && (
              <div>Instruction: <span className="text-pink-400 font-semibold">{metadata.instruction}</span></div>
            )}
            {metadata.label && (
              <div>Label: <span className="text-indigo-400 font-semibold">{metadata.label}</span></div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MemoryView() {
  const { memory, selectedMemoryAddress, selectMemoryAddress } = useAssemblerStore();

  const memoryStats = useMemo(() => {
    if (!memory) return null;

    let codeBytes = 0;
    let dataBytes = 0;
    let modifiedBytes = 0;

    for (const [, metadata] of memory.metadata) {
      switch (metadata.type) {
        case 'code': codeBytes++; break;
        case 'data': dataBytes++; break;
        case 'modified': modifiedBytes++; break;
      }
    }

    return {
      programStart: memory.programStart,
      programEnd: memory.programEnd,
      programSize: memory.programEnd - memory.programStart,
      codeBytes,
      dataBytes,
      modifiedBytes
    };
  }, [memory]);

  if (!memory) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Memory View</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Load the object program into memory to see the byte-by-byte visualization.
          </p>
        </CardContent>
      </Card>
    );
  }

  const visibleRange = {
    start: memory.programStart,
    end: Math.min(memory.programStart + 512, memory.bytes.length) // Show 512 bytes around program
  };
  const displayRows = Math.ceil((visibleRange.end - visibleRange.start) / BYTES_PER_ROW);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Memory View</CardTitle>
          <div className="flex gap-2 flex-wrap">
            {memoryStats && (
              <>
                <Badge variant="outline">
                  {formatAddress(memoryStats.programStart, 4)} - {formatAddress(memoryStats.programEnd, 4)}
                </Badge>
                <Badge variant="secondary" className="bg-blue-500/30">
                  Code: {memoryStats.codeBytes}
                </Badge>
                {memoryStats.modifiedBytes > 0 && (
                  <Badge variant="secondary" className="bg-purple-500/30">
                    Modified: {memoryStats.modifiedBytes}
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4">
        <ResizablePanelGroup direction="vertical">
          {/* Memory Grid Panel */}
          <ResizablePanel defaultSize={70} minSize={40}>
            <div className="h-full flex flex-col">
              {/* Legend */}
              <div className="flex gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-500/30 rounded" />
                  <span>Code</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-500/30 rounded" />
                  <span>Data</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-purple-500/30 rounded" />
                  <span>Modified</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-muted/30 rounded" />
                  <span>Empty</span>
                </div>
              </div>

              {/* Memory Grid */}
              <div className="border rounded-md overflow-hidden bg-background flex-1">
                <Grid
                  cellComponent={CellComponent}
                  cellProps={{
                    memory,
                    visibleStart: visibleRange.start,
                    selectedMemoryAddress,
                    selectMemoryAddress
                  }}
                  columnCount={BYTES_PER_ROW + 1}
                  columnWidth={(index: number) => index === 0 ? ADDRESS_COLUMN_WIDTH : CELL_SIZE}
                  rowCount={displayRows}
                  rowHeight={CELL_SIZE}
                  style={{ height: '100%', width: ADDRESS_COLUMN_WIDTH + (BYTES_PER_ROW * CELL_SIZE) + 20 }}
                />
              </div>
            </div>
          </ResizablePanel>

          {/* Selected byte details panel */}
          {selectedMemoryAddress !== null && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={15}>
                <div className="p-3 bg-muted/50 rounded-md h-full overflow-auto">
                  <h4 className="text-sm font-semibold mb-3 text-foreground">Selected Byte Details</h4>
                  <SelectedByteDetails address={selectedMemoryAddress} />
                </div>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </CardContent>
    </Card>
  );
}

function SelectedByteDetails({ address }: { address: number }) {
  const { memory } = useAssemblerStore();

  if (!memory) return null;

  const metadata = getByteMetadata(memory, address);

  return (
    <div className="grid grid-cols-2 gap-3 text-sm font-mono">
      <div className="text-foreground">Address: <span className="text-blue-500 dark:text-blue-400 font-semibold">{formatAddress(address, 6)}</span></div>
      <div className="text-foreground">Value: <span className="text-green-500 dark:text-green-400 font-semibold">{formatByteHex(metadata.value)} ({metadata.value})</span></div>
      <div className="text-foreground">ASCII: <span className="text-purple-500 dark:text-purple-400 font-semibold">{formatByteAscii(metadata.value)}</span></div>
      <div className="text-foreground">Type: <span className="text-cyan-500 dark:text-cyan-400 font-semibold">{metadata.type}</span></div>
      {metadata.sourceLineNumber && (
        <div className="col-span-2 text-foreground">Source Line: <span className="text-orange-500 dark:text-orange-400 font-semibold">{metadata.sourceLineNumber}</span></div>
      )}
      {metadata.instruction && (
        <div className="col-span-2 text-foreground">Instruction: <span className="text-pink-500 dark:text-pink-400 font-semibold">{metadata.instruction}</span></div>
      )}
      {metadata.label && (
        <div className="col-span-2 text-foreground">Label: <span className="text-indigo-500 dark:text-indigo-400 font-semibold">{metadata.label}</span></div>
      )}
    </div>
  );
}
