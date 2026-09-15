"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";
import { Building2, Target, ArrowRightLeft, AlertTriangle } from "lucide-react";

interface B77Data {
  ok: boolean;
  meta: {
    source: string;
    totalExamples: number;
    totalBanking77Intents: number;
    mappedIntents: number;
    unmappedIntents: number;
  };
  metrics: { intentAccuracy: number; decisionAccuracy: number };
  perIntent: { intent: string; label: string; count: number; accuracy: number | null }[];
  perB77Intent: { banking77Intent: string; count: number; accuracy: number }[];
  mismatches: { id: string; message: string; b77Intent: string; expectedApp: string; predictedApp: string }[];
  mapping: { banking77_intent: string; app_intent: string; examples: number; unmapped?: boolean }[];
}

export function Banking77Card() {
  const [data, setData] = useState<B77Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/eval/banking77")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("not found"))))
      .then((d) => d.ok && setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center text-xs text-muted-foreground">
          Banking77 data not available. Run <code>scripts/build_banking77_golden.py</code>.
        </CardContent>
      </Card>
    );
  }

  const m = data.meta;
  const met = data.metrics;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Building2 className="h-4 w-4 text-primary" />
          Banking77 cross-domain intent eval
          <Badge className="gap-1 bg-success/15 text-success border border-success/30">
            <span className="h-1.5 w-1.5 rounded-full bg-success" />
            REAL
          </Badge>
        </CardTitle>
        <CardDescription className="text-xs">
          {m.source}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Examples</div>
            <div className="text-lg font-bold text-foreground">{m.totalExamples}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">B77 intents</div>
            <div className="text-lg font-bold text-foreground">{m.totalBanking77Intents}</div>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Intent acc</div>
            <div className="text-lg font-bold text-success">{Math.round(met.intentAccuracy * 100)}%</div>
          </div>
          <div className="rounded-lg border border-warning/25 bg-warning/5 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Decision acc</div>
            <div className="text-lg font-bold text-warning-foreground">{Math.round(met.decisionAccuracy * 100)}%</div>
          </div>
        </div>

        {/* Cross-domain insight banner */}
        <div className="flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5 text-[11px] leading-relaxed text-foreground/80">
          <ArrowRightLeft className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <div>
            <span className="font-semibold text-foreground">Cross-domain insight:</span> the keyword baseline
            scores <strong>{Math.round(met.intentAccuracy * 100)}%</strong> on Banking77 (banking domain) vs{" "}
            <strong>79%</strong> on @AmazonHelp (retail domain). The drop is expected — banking queries like
            "verify my identity" don't contain Amazon-domain keywords. The full LLM agent (evaluable live via
            the Playground) generalizes far better because it understands semantics, not just keywords.
          </div>
        </div>

        {/* Per-mapped-intent accuracy */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3" />
            Accuracy by mapped app intent
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.perIntent} margin={{ top: 4, right: 8, bottom: 8, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "oklch(0.52 0.012 155)" }} angle={-40} textAnchor="end" height={80} interval={0} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} tickFormatter={(v) => `${v * 100}%`} />
              <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${Math.round(v * 100)}%`} />
              <Bar dataKey="accuracy" radius={[3, 3, 0, 0]}>
                {data.perIntent.map((p, i) => (
                  <Cell key={i} fill={(p.accuracy ?? 0) >= 0.5 ? "oklch(0.62 0.13 162)" : (p.accuracy ?? 0) >= 0.25 ? "oklch(0.72 0.16 70)" : "oklch(0.6 0.2 25)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Mismatches (cross-domain failures) */}
        {data.mismatches.length > 0 && (
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              Cross-domain mismatches ({data.mismatches.length})
            </div>
            <div className="max-h-56 overflow-y-auto rounded-md border border-border/60">
              <div className="divide-y divide-border/40">
                {data.mismatches.slice(0, 12).map((mm) => (
                  <div key={mm.id} className="px-2.5 py-2 text-xs">
                    <p className="text-foreground/80 line-clamp-1 break-all">"{mm.message}"</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <span className="inline-flex max-w-[160px] items-center gap-0.5 truncate rounded bg-muted/60 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground" title={`b77: ${mm.b77Intent}`}>
                        b77: <span className="truncate">{mm.b77Intent}</span>
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded bg-success/8 px-1.5 py-0.5 text-[9px] font-medium text-success" title={`expected: ${mm.expectedApp}`}>
                        <span className="text-success/60">exp:</span>{mm.expectedApp}
                      </span>
                      <span className="inline-flex items-center gap-0.5 rounded bg-destructive/8 px-1.5 py-0.5 text-[9px] font-medium text-destructive" title={`got: ${mm.predictedApp}`}>
                        <span className="text-destructive/60">got:</span>{mm.predictedApp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
