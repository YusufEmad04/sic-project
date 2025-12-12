'use client';

/**
 * Object Program Display Component
 * Shows H, T, M, E records with explanations
 */

import { useAssemblerStore } from '../lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { explainRecord } from '../lib/objectProgram';

export function ObjectProgramDisplay() {
  const { objectProgram } = useAssemblerStore();

  if (!objectProgram) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg">Object Program</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Complete assembly to see the object program (H/T/M/E records).
          </p>
        </CardContent>
      </Card>
    );
  }

  const { header, textRecords, modificationRecords, endRecord, rawRecords } = objectProgram;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Object Program</CardTitle>
          <div className="flex gap-2">
            <Badge>H: 1</Badge>
            <Badge variant="secondary">T: {textRecords.length}</Badge>
            <Badge variant="outline">M: {modificationRecords.length}</Badge>
            <Badge>E: 1</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-4">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {/* Raw Output */}
            <div>
              <h4 className="text-sm font-medium mb-2">Raw Object Program</h4>
              <div className="bg-muted p-3 rounded-md font-mono text-sm">
                {rawRecords.map((record, index) => (
                  <div key={index} className="whitespace-pre">
                    {record}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Header Record */}
            <RecordCard
              type="H"
              title="Header Record"
              record={header.raw}
              explanation={explainRecord(header.raw)}
              color="text-blue-400"
            />

            {/* Text Records */}
            {textRecords.map((record, index) => (
              <RecordCard
                key={`T-${index}`}
                type="T"
                title={`Text Record ${index + 1}`}
                record={record.raw}
                explanation={explainRecord(record.raw)}
                color="text-green-400"
              />
            ))}

            {/* Modification Records */}
            {modificationRecords.map((record, index) => (
              <RecordCard
                key={`M-${index}`}
                type="M"
                title={`Modification Record ${index + 1}`}
                record={record.raw}
                explanation={explainRecord(record.raw)}
                color="text-yellow-400"
              />
            ))}

            {/* End Record */}
            <RecordCard
              type="E"
              title="End Record"
              record={endRecord.raw}
              explanation={explainRecord(endRecord.raw)}
              color="text-purple-400"
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function RecordCard({
  type,
  title,
  record,
  explanation,
  color
}: {
  type: string;
  title: string;
  record: string;
  explanation: string;
  color: string;
}) {
  return (
    <div className="border rounded-md p-3">
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="outline" className={color}>
          {type}
        </Badge>
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="font-mono text-sm bg-muted p-2 rounded mb-2">
        {record}
      </div>
      <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
        {explanation}
      </pre>
    </div>
  );
}
