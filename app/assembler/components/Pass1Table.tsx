'use client';

/**
 * Pass 1 Table Component
 * Displays the intermediate file from Pass 1 with LOCCTR and symbol table
 */

import { useAssemblerStore } from '../lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

function formatHex(value: number | null | undefined, digits: number = 4): string {
  if (value === null || value === undefined) return '-';
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

export function Pass1Table() {
  const { pass1Result, selectedLineNumber, selectLine } = useAssemblerStore();

  if (!pass1Result) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Pass 1 Output</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Run Pass 1 to see the intermediate file and symbol table.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { intermediateFile, symbolTable, programName, startAddress, programLength } = pass1Result;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pass 1 Output</CardTitle>
          <div className="flex gap-2">
            <Badge variant="outline">
              {programName}
            </Badge>
            <Badge variant="secondary">
              Start: {formatHex(startAddress, 6)}
            </Badge>
            <Badge variant="secondary">
              Length: {formatHex(programLength, 6)}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden p-4">
        {/* Symbol Table */}
        <div className="flex-shrink-0">
          <h4 className="text-sm font-medium mb-2">Symbol Table (SYMTAB)</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(symbolTable).map(([name, address]) => (
              <Badge
                key={name}
                variant="outline"
                className="font-mono cursor-pointer hover:bg-accent"
                onClick={() => {
                  // Find line with this label
                  const entry = intermediateFile.find(e => e.line.label?.toUpperCase() === name);
                  if (entry) selectLine(entry.line.lineNumber);
                }}
              >
                {name}: {formatHex(address, 4)}
              </Badge>
            ))}
          </div>
        </div>

        {/* Intermediate File Table */}
        <div className="flex-1 overflow-hidden">
          <h4 className="text-sm font-medium mb-2">Intermediate File</h4>
          <ScrollArea className="h-full border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Line</TableHead>
                  <TableHead className="w-16">LOCCTR</TableHead>
                  <TableHead className="w-20">Label</TableHead>
                  <TableHead className="w-20">Opcode</TableHead>
                  <TableHead>Operand</TableHead>
                  <TableHead className="w-12">Size</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intermediateFile.map((entry, index) => {
                  const line = entry.line;
                  const isSelected = selectedLineNumber === line.lineNumber;
                  const isComment = line.isComment;
                  const isEmpty = line.isEmpty;

                  if (isEmpty) return null;

                  return (
                    <TableRow
                      key={index}
                      className={`cursor-pointer ${isSelected ? 'bg-accent' : ''} ${isComment ? 'text-muted-foreground' : ''}`}
                      onClick={() => selectLine(line.lineNumber)}
                    >
                      <TableCell className="font-mono text-xs">
                        {line.lineNumber}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.locctr !== null ? formatHex(entry.locctr, 4) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-blue-400">
                        {line.label || ''}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {isComment ? '' : (
                          <span className={line.isExtended ? 'text-yellow-400' : ''}>
                            {line.isExtended ? '+' : ''}{line.opcode}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {isComment ? (
                          <span className="text-green-600">{line.comment}</span>
                        ) : (
                          <>
                            {line.operand}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.size > 0 ? entry.size : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
