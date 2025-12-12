'use client';

/**
 * Instruction Breakdown Component
 * Shows detailed breakdown of selected instruction's object code
 */

import { useAssemblerStore } from '../lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export function InstructionBreakdown() {
  const { pass2Result, selectedLineNumber } = useAssemblerStore();

  // Find selected entry
  const selectedEntry = pass2Result?.entries.find(
    e => e.line.lineNumber === selectedLineNumber
  );

  if (!selectedEntry || !selectedEntry.objectCode) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Instruction Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Select an instruction from Pass 1 or Pass 2 table to see its detailed breakdown.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { line, format, nixbpe, targetAddress, displacement, displacementMode, addressingMode, objectCode, breakdown } = selectedEntry;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Instruction Breakdown</CardTitle>
          <Badge variant="outline">Line {line.lineNumber}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-4 space-y-4">
        {/* Source Line */}
        <div>
          <h4 className="text-sm font-medium mb-2">Source Line</h4>
          <div className="font-mono text-sm bg-muted p-2 rounded">
            {line.label && <span className="text-blue-400">{line.label}  </span>}
            {line.isExtended && <span className="text-yellow-400">+</span>}
            <span className="text-primary">{line.opcode}</span>
            {line.operand && (
              <>
                {'  '}
                <span>{line.operand}</span>
              </>
            )}
          </div>
        </div>

        <Separator />

        {/* Format and Object Code */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Format</h4>
            <Badge variant="secondary" className="text-lg">
              Format {format}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {format === 1 && '1 byte: opcode only'}
              {format === 2 && '2 bytes: opcode + registers'}
              {format === 3 && '3 bytes: opcode + nixbpe + 12-bit disp'}
              {format === 4 && '4 bytes: opcode + nixbpe + 20-bit addr'}
            </p>
          </div>
          <div>
            <h4 className="text-sm font-medium mb-2">Object Code</h4>
            <div className="font-mono text-xl font-bold text-primary">
              {objectCode}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {objectCode.length / 2} bytes
            </p>
          </div>
        </div>

        {/* nixbpe Flags */}
        {nixbpe && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Addressing Flags (nixbpe)</h4>
              <div className="grid grid-cols-6 gap-2">
                <FlagBox name="n" value={nixbpe.n} description="Indirect" />
                <FlagBox name="i" value={nixbpe.i} description="Immediate" />
                <FlagBox name="x" value={nixbpe.x} description="Indexed" />
                <FlagBox name="b" value={nixbpe.b} description="BASE-rel" />
                <FlagBox name="p" value={nixbpe.p} description="PC-rel" />
                <FlagBox name="e" value={nixbpe.e} description="Extended" />
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">
                Binary: {nixbpe.n}{nixbpe.i}{nixbpe.x}{nixbpe.b}{nixbpe.p}{nixbpe.e}
              </div>
            </div>
          </>
        )}

        {/* Addressing Mode */}
        {addressingMode && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Addressing Mode</h4>
              <Badge className={
                addressingMode === 'immediate' ? 'bg-orange-500' :
                  addressingMode === 'indirect' ? 'bg-red-500' :
                    addressingMode === 'simple' ? 'bg-blue-500' :
                      'bg-gray-500'
              }>
                {addressingMode.charAt(0).toUpperCase() + addressingMode.slice(1)}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">
                {addressingMode === 'immediate' && 'Operand value is used directly (not as address)'}
                {addressingMode === 'indirect' && 'Operand points to address containing target address'}
                {addressingMode === 'simple' && 'Operand is the target address'}
                {addressingMode === 'sic-compatible' && 'SIC-compatible direct addressing'}
              </p>
            </div>
          </>
        )}

        {/* Displacement Calculation */}
        {displacement !== null && (format === 3 || format === 4) && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Displacement Calculation</h4>
              <div className="space-y-2 text-sm">
                {targetAddress !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Address (TA):</span>
                    <span className="font-mono text-primary">
                      {targetAddress.toString(16).toUpperCase().padStart(4, '0')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Displacement Mode:</span>
                  <Badge variant="outline" className={
                    displacementMode === 'PC-relative' ? 'text-green-400' :
                      displacementMode === 'BASE-relative' ? 'text-yellow-400' :
                        ''
                  }>
                    {displacementMode}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Displacement Value:</span>
                  <span className="font-mono text-primary">
                    {displacement.toString(16).toUpperCase().padStart(format === 3 ? 3 : 5, '0')}
                    {' '}({displacement} decimal)
                  </span>
                </div>

                {displacementMode === 'PC-relative' && (
                  <div className="mt-2 p-2 bg-green-500/10 rounded text-xs">
                    <p className="font-medium text-green-400">PC-Relative Addressing:</p>
                    <p className="font-mono mt-1">
                      disp = TA - PC = {targetAddress?.toString(16).toUpperCase()} - (current + {format})
                    </p>
                    <p className="text-muted-foreground mt-1">
                      PC points to next instruction when current instruction executes.
                    </p>
                  </div>
                )}

                {displacementMode === 'BASE-relative' && (
                  <div className="mt-2 p-2 bg-yellow-500/10 rounded text-xs">
                    <p className="font-medium text-yellow-400">BASE-Relative Addressing:</p>
                    <p className="font-mono mt-1">
                      disp = TA - BASE
                    </p>
                    <p className="text-muted-foreground mt-1">
                      Used when PC-relative displacement is out of range (-2048 to 2047).
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Binary Breakdown */}
        {breakdown && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Binary Breakdown</h4>
              <div className="font-mono text-xs space-y-1">
                {format >= 3 && (
                  <>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-20">Opcode:</span>
                      <span className="text-blue-400">{breakdown.opcodeBits}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-20">nixbpe:</span>
                      <span className="text-purple-400">{breakdown.nixbpeBits}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-20">{format === 4 ? 'Address:' : 'Disp:'}</span>
                      <span className="text-green-400">{breakdown.displacementBits}</span>
                    </div>
                    <div className="flex gap-2 mt-2 pt-2 border-t">
                      <span className="text-muted-foreground w-20">Full Binary:</span>
                      <span className="text-primary">{breakdown.fullBinary}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-20">Full Hex:</span>
                      <span className="text-primary font-bold">{breakdown.fullHex}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function FlagBox({
  name,
  value,
  description
}: {
  name: string;
  value: 0 | 1;
  description: string;
}) {
  const isActive = value === 1;

  return (
    <div className={`text-center p-2 rounded border ${isActive ? 'bg-primary/20 border-primary' : 'bg-muted/30 border-muted'}`}>
      <div className={`text-lg font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
        {name}
      </div>
      <div className={`text-xl font-mono ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground">
        {description}
      </div>
    </div>
  );
}
