'use client';

/**
 * Error Panel Component
 * Displays detailed error information with step context
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAssemblerStore } from '../lib/store';
import { PHASE_NAMES, AssemblerPhaseType } from '../lib/types';
import { AlertCircle, AlertTriangle, ChevronRight, FileCode, Hash, MapPin, Tag, Terminal } from 'lucide-react';

/**
 * Get badge color based on phase
 */
function getPhaseBadgeVariant(phase: AssemblerPhaseType): 'default' | 'secondary' | 'outline' | 'destructive' {
    switch (phase) {
        case 'lexer':
            return 'outline';
        case 'parser':
            return 'secondary';
        case 'pass1':
            return 'default';
        case 'pass2':
            return 'default';
        case 'objectgen':
            return 'secondary';
        case 'loader':
            return 'outline';
        default:
            return 'default';
    }
}

/**
 * Get step number for ordering
 */
function getPhaseOrder(phase: AssemblerPhaseType): number {
    const order: Record<AssemblerPhaseType, number> = {
        lexer: 1,
        parser: 2,
        pass1: 3,
        pass2: 4,
        objectgen: 5,
        loader: 6
    };
    return order[phase] ?? 0;
}

export function ErrorPanel() {
    const { errors, currentPhase, tokenizedLines, sourceCode } = useAssemblerStore();

    // Sort errors by phase order, then by line number
    const sortedErrors = [...errors].sort((a, b) => {
        const phaseOrderA = getPhaseOrder(a.phase);
        const phaseOrderB = getPhaseOrder(b.phase);
        if (phaseOrderA !== phaseOrderB) {
            return phaseOrderA - phaseOrderB;
        }
        return a.lineNumber - b.lineNumber;
    });

    // Group errors by phase for summary
    const errorsByPhase = errors.reduce((acc, err) => {
        if (!acc[err.phase]) {
            acc[err.phase] = { errors: 0, warnings: 0 };
        }
        if (err.type === 'error') {
            acc[err.phase].errors++;
        } else {
            acc[err.phase].warnings++;
        }
        return acc;
    }, {} as Record<string, { errors: number; warnings: number }>);

    // Get source line content helper
    const getSourceLineContent = (lineNumber: number): string => {
        if (lineNumber <= 0) return '';
        // Try from tokenized lines first
        const tokenized = tokenizedLines.find(t => t.lineNumber === lineNumber);
        if (tokenized?.rawLine) return tokenized.rawLine;
        // Fall back to splitting source code
        const lines = sourceCode.split('\n');
        if (lineNumber <= lines.length) {
            return lines[lineNumber - 1];
        }
        return '';
    };

    if (errors.length === 0) {
        return (
            <Card className="h-full">
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Errors & Warnings
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
                        <p className="text-lg">No errors or warnings</p>
                        <p className="text-sm">
                            {currentPhase === 'idle'
                                ? 'Run the assembler to check for errors'
                                : currentPhase === 'complete'
                                    ? 'Assembly completed successfully!'
                                    : `Current phase: ${currentPhase}`
                            }
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        Errors & Warnings
                    </span>
                    <div className="flex gap-2">
                        <Badge variant="destructive">
                            {errors.filter(e => e.type === 'error').length} Errors
                        </Badge>
                        {errors.filter(e => e.type === 'warning').length > 0 && (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
                                {errors.filter(e => e.type === 'warning').length} Warnings
                            </Badge>
                        )}
                    </div>
                </CardTitle>

                {/* Phase Summary */}
                <div className="flex flex-wrap gap-2 mt-2">
                    {Object.entries(errorsByPhase).map(([phase, counts]) => (
                        <div key={phase} className="flex items-center gap-1 text-xs">
                            <Badge variant={getPhaseBadgeVariant(phase as AssemblerPhaseType)} className="text-xs">
                                {PHASE_NAMES[phase as AssemblerPhaseType] ?? phase}
                            </Badge>
                            <span className="text-muted-foreground">
                                ({counts.errors > 0 ? `${counts.errors}E` : ''}{counts.errors > 0 && counts.warnings > 0 ? ', ' : ''}{counts.warnings > 0 ? `${counts.warnings}W` : ''})
                            </span>
                        </div>
                    ))}
                </div>
            </CardHeader>

            <Separator />

            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4 space-y-4">
                        {sortedErrors.map((error, index) => {
                            const sourceLine = error.sourceLine || getSourceLineContent(error.lineNumber);

                            return (
                                <div
                                    key={index}
                                    className={`rounded-lg border p-3 ${error.type === 'error'
                                            ? 'border-destructive/50 bg-destructive/5'
                                            : 'border-yellow-500/50 bg-yellow-500/5'
                                        }`}
                                >
                                    {/* Error Header */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2">
                                            {error.type === 'error' ? (
                                                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                                            ) : (
                                                <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
                                            )}
                                            <Badge variant={getPhaseBadgeVariant(error.phase)} className="text-xs">
                                                Step {getPhaseOrder(error.phase)}: {PHASE_NAMES[error.phase]}
                                            </Badge>
                                        </div>
                                        {error.lineNumber > 0 && (
                                            <Badge variant="outline" className="text-xs shrink-0">
                                                <Hash className="w-3 h-3 mr-1" />
                                                Line {error.lineNumber}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* Error Message */}
                                    <p className={`font-medium mb-2 ${error.type === 'error' ? 'text-destructive' : 'text-yellow-600 dark:text-yellow-400'
                                        }`}>
                                        {error.message}
                                    </p>

                                    {/* Source Context */}
                                    {sourceLine && (
                                        <div className="mt-2 mb-2">
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                                                <FileCode className="w-3 h-3" />
                                                Source Line:
                                            </div>
                                            <pre className="bg-muted/50 rounded px-2 py-1 text-xs font-mono overflow-x-auto">
                                                {sourceLine}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Parsed Components */}
                                    {(error.label || error.opcode || error.operand) && (
                                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                                            {error.label && (
                                                <div className="flex items-center gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded px-2 py-0.5">
                                                    <Tag className="w-3 h-3" />
                                                    Label: <code className="font-mono">{error.label}</code>
                                                </div>
                                            )}
                                            {error.opcode && (
                                                <div className="flex items-center gap-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded px-2 py-0.5">
                                                    <Terminal className="w-3 h-3" />
                                                    Opcode: <code className="font-mono">{error.opcode}</code>
                                                </div>
                                            )}
                                            {error.operand && (
                                                <div className="flex items-center gap-1 bg-green-500/10 text-green-600 dark:text-green-400 rounded px-2 py-0.5">
                                                    <ChevronRight className="w-3 h-3" />
                                                    Operand: <code className="font-mono">{error.operand}</code>
                                                </div>
                                            )}
                                            {error.locctr && (
                                                <div className="flex items-center gap-1 bg-orange-500/10 text-orange-600 dark:text-orange-400 rounded px-2 py-0.5">
                                                    <MapPin className="w-3 h-3" />
                                                    LOCCTR: <code className="font-mono">{error.locctr}</code>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Additional Details */}
                                    {error.details && (
                                        <div className="mt-2 pt-2 border-t border-border/50">
                                            <p className="text-xs text-muted-foreground">
                                                <strong>Details:</strong> {error.details}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
