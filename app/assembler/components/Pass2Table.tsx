'use client';

/**
 * Pass 2 Table Component
 * Displays the Pass 2 output with object code and addressing details
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

function formatHex(value: number | null | undefined, digits: number = 4): string {
  if (value === null || value === undefined) return '-';
  return value.toString(16).toUpperCase().padStart(digits, '0');
}

export function Pass2Table() {
  const { pass2Result, selectedLineNumber, selectLine } = useAssemblerStore();

  if (!pass2Result) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Pass 2 Output</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Run Pass 2 to see the object code generation details.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { entries, baseRegister } = pass2Result;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Pass 2 Output</CardTitle>
          <Badge variant="outline">
            BASE: {baseRegister !== null ? formatHex(baseRegister, 4) : 'not set'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4">
        <ScrollArea className="h-full border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Line</TableHead>
                <TableHead className="w-16">Loc</TableHead>
                <TableHead className="w-12">Fmt</TableHead>
                <TableHead className="w-24">nixbpe</TableHead>
                <TableHead className="w-20">Addr Mode</TableHead>
                <TableHead className="w-16">Target</TableHead>
                <TableHead className="w-16">Disp</TableHead>
                <TableHead>Object Code</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, index) => {
                const line = entry.line;
                const isSelected = selectedLineNumber === line.lineNumber;
                const isComment = line.isComment;
                const isEmpty = line.isEmpty;

                if (isEmpty || isComment) return null;
                if (!entry.objectCode && entry.format === 0) return null;

                return (
                  <TableRow
                    key={index}
                    className={`cursor-pointer ${isSelected ? 'bg-accent' : ''}`}
                    onClick={() => selectLine(line.lineNumber)}
                  >
                    <TableCell className="font-mono text-xs">
                      {line.lineNumber}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatHex(line.location, 4)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.format > 0 ? entry.format : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {entry.nixbpe ? (
                        <NixbpeDisplay nixbpe={entry.nixbpe} />
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {entry.addressingMode ? (
                        <Badge variant="outline" className="text-xs">
                          {entry.addressingMode}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {formatHex(entry.targetAddress, 4)}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            {entry.displacement !== null ? (
                              <span className={entry.displacementMode === 'PC-relative' ? 'text-green-400' : entry.displacementMode === 'BASE-relative' ? 'text-yellow-400' : ''}>
                                {formatHex(entry.displacement, 3)}
                              </span>
                            ) : '-'}
                          </TooltipTrigger>
                          <TooltipContent>
                            {entry.displacementMode !== 'none' ? entry.displacementMode : 'No displacement'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {entry.objectCode || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function NixbpeDisplay({ nixbpe }: { nixbpe: { n: 0 | 1; i: 0 | 1; x: 0 | 1; b: 0 | 1; p: 0 | 1; e: 0 | 1 } }) {
  const flags = [
    { name: 'n', value: nixbpe.n, color: 'text-red-400' },
    { name: 'i', value: nixbpe.i, color: 'text-orange-400' },
    { name: 'x', value: nixbpe.x, color: 'text-yellow-400' },
    { name: 'b', value: nixbpe.b, color: 'text-green-400' },
    { name: 'p', value: nixbpe.p, color: 'text-blue-400' },
    { name: 'e', value: nixbpe.e, color: 'text-purple-400' },
  ];

  return (
    <div className="flex gap-0.5">
      {flags.map(flag => (
        <span
          key={flag.name}
          className={`${flag.value ? flag.color : 'text-muted-foreground/30'}`}
        >
          {flag.value}
        </span>
      ))}
    </div>
  );
}
