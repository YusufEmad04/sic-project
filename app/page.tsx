import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center text-center gap-8 max-w-3xl mx-auto">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Educational Tool
          </Badge>

          <h1 className="text-5xl font-bold tracking-tight">
            SIC/XE Assembler Simulator
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl">
            An interactive two-pass assembler simulator for the Simplified Instructional Computer
            Extended (SIC/XE) architecture. Watch the assembly process step by step.
          </p>

          <div className="flex gap-4">
            <Link href="/assembler">
              <Button size="lg" className="text-lg px-8">
                Start Simulation
              </Button>
            </Link>
            <Link href="/docs">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Documentation
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Features</h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <FeatureCard
            title="Two-Pass Assembly"
            description="Complete implementation of the classic two-pass assembler algorithm with symbol table construction and object code generation."
          />
          <FeatureCard
            title="Interactive Editor"
            description="Monaco-powered code editor with SIC/XE syntax highlighting, line numbers, and real-time error feedback."
          />
          <FeatureCard
            title="Pass 1 Visualization"
            description="See how LOCCTR advances, the symbol table builds, and instruction sizes are calculated."
          />
          <FeatureCard
            title="Pass 2 Visualization"
            description="Watch object code generation with detailed nixbpe flag breakdown and displacement calculation."
          />
          <FeatureCard
            title="Object Program Display"
            description="View the complete object program with Header, Text, Modification, and End records."
          />
          <FeatureCard
            title="Memory View"
            description="Explore the loaded program in a virtualized memory grid with byte-level details."
          />
        </div>
      </div>

      {/* Architecture Info */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">SIC/XE Architecture</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Addressing Modes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>n=0, i=1</Badge>
                  <span className="text-sm">Immediate (#)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>n=1, i=0</Badge>
                  <span className="text-sm">Indirect (@)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>n=1, i=1</Badge>
                  <span className="text-sm">Simple/Direct</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>x=1</Badge>
                  <span className="text-sm">Indexed (,X)</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Instruction Formats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Format 1</Badge>
                  <span className="text-sm">1 byte - opcode only</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Format 2</Badge>
                  <span className="text-sm">2 bytes - opcode + registers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Format 3</Badge>
                  <span className="text-sm">3 bytes - 12-bit displacement</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Format 4</Badge>
                  <span className="text-sm">4 bytes - 20-bit address</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>SIC/XE Assembler Simulator - Built for educational purposes</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-sm">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
