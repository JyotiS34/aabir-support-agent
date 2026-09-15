"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
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
import {
  ClipboardCheck,
  Target,
  Scale,
  AlertTriangle,
  Play,
  Loader2,
  CheckCircle2,
  XCircle,
  Trophy,
  Sparkles,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { exportToCsv } from "@/lib/csv";
import { Banking77Card } from "./banking77-card";

interface EvalData {
  meta: { goldenSetSize: number; goldenSetFull: number; methodology: string; isRealDataset?: boolean; source?: string; amazonExamples?: number; banking77Examples?: number };
  metrics: {
    intentAccuracy: number;
    decisionAccuracy: number;
    decisionF1: number;
    decisionPrecision: number;
    decisionRecall: number;
    acceptableRate: number;
    judgeKappa: number;
  };
  byDifficulty: { difficulty: string; count: number; intentAccuracy: number; decisionAccuracy: number; acceptableRate: number }[];
  perIntent: { intent: string; label: string; count: number; accuracy: number | null }[];
  baselines: { name: string; description: string; intentAccuracy: number; decisionAccuracy: number; decisionF1: number; judgeAccept: number; judgeKappa: number; p50LatencyMs: number; falseAutoOnSensitive: number }[];
  judgeAgreement: { kappa: number; agreementRate: number; humanJudgedN: number; method: string };
  mismatches: { id: string; message: string; expected: string; predicted: string }[];
  examples: any[];
}

interface LiveRunResult {
  sampleSize: number;
  metrics: { intentAccuracy: number; decisionAccuracy: number; acceptableRate: number };
  results: any[];
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-10" style={{ background: color }} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <div className="mt-1.5 text-3xl font-bold tracking-tight" style={{ color }}>{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function EvalView() {
  const [data, setData] = useState<EvalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [live, setLive] = useState<LiveRunResult | null>(null);

  useEffect(() => {
    fetch("/api/eval")
      .then((r) => r.json())
      .then((d) => d.ok && setData(d))
      .finally(() => setLoading(false));
  }, []);

  const handleLiveRun = async () => {
    setRunning(true);
    setLive(null);
    try {
      const res = await fetch("/api/eval/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sampleSize: 4 }),
      });
      const d = await res.json();
      if (d.ok) {
        setLive(d);
        toast.success(`Live eval complete on ${d.sampleSize} examples`);
      } else {
        toast.error("Eval run failed", { description: d.error });
      }
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "" });
    } finally {
      setRunning(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const m = data.metrics;

  return (
    <div className="space-y-5">
      {/* Methodology banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">
                  Golden set: {data.meta.goldenSetSize} examples
                </span>
                {data.meta.isRealDataset && data.meta.amazonExamples != null && data.meta.banking77Examples != null && (
                  <span className="text-[10px] text-muted-foreground">
                    ({data.meta.amazonExamples} Amazon + {data.meta.banking77Examples} Banking77)
                  </span>
                )}
                {data.meta.isRealDataset ? (
                  <Badge className="gap-1 bg-success/15 text-success border border-success/30">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />
                    REAL dataset
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">synthetic</Badge>
                )}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {data.meta.isRealDataset
                  ? "120 real @AmazonHelp tweets (Kaggle) + 55 Banking77 cross-domain = 175 golden examples. Stratified 10 per intent × easy/medium/hard. Each label assigned by reviewing the message against the 12-intent taxonomy."
                  : data.meta.methodology}
              </p>
              {data.meta.isRealDataset && data.meta.source && (
                <p className="mt-0.5 text-[10px] leading-relaxed text-muted-foreground/70">
                  {data.meta.source}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                exportToCsv("aabir-eval-results.csv", data.examples.map((e: any) => ({
                  id: e.id,
                  message: e.message,
                  expectedIntent: e.expectedIntent,
                  predictedIntent: e.predictedIntent,
                  intentCorrect: e.intentCorrect ? "yes" : "no",
                  expectedDecision: e.expectedDecision,
                  predictedDecision: e.predictedDecision,
                  decisionCorrect: e.decisionCorrect ? "yes" : "no",
                  difficulty: e.difficulty,
                  judgeOverall: e.judgeOverall?.toFixed(3) ?? "",
                  acceptable: e.acceptable ? "yes" : "no",
                  note: e.note,
                })));
                toast.success("Exported evaluation results", { description: "aabir-eval-results.csv" });
              }}
              className="gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button onClick={handleLiveRun} disabled={running} className="gap-2">
              {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {running ? "Running live…" : "Run live eval (4 samples)"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard icon={Target} label="Intent accuracy" value={`${Math.round(m.intentAccuracy * 100)}%`} sub="Exact-match on golden labels" color="oklch(0.62 0.13 162)" />
        <MetricCard icon={Scale} label="Decision F1" value={m.decisionF1.toFixed(2)} sub={`Precision ${m.decisionPrecision.toFixed(2)} · Recall ${m.decisionRecall.toFixed(2)}`} color="oklch(0.7 0.12 180)" />
        <MetricCard icon={Sparkles} label="Judge accept rate" value={`${Math.round(m.acceptableRate * 100)}%`} sub="LLM-as-judge overall ≥ 0.7" color="oklch(0.72 0.16 70)" />
        <MetricCard icon={Scale} label="Judge–human κ" value={m.judgeKappa.toFixed(2)} sub={`${data.judgeAgreement.humanJudgedN} human-judged`} color="oklch(0.68 0.17 45)" />
      </div>

      {/* Banking77 cross-domain intent eval (secondary dataset — moved up for visibility) */}
      <Banking77Card />

      {/* Live run results */}
      <AnimatePresence>
        {live && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="border-success/30 bg-success/5">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Play className="h-4 w-4 text-success" />
                  Live eval run — {live.sampleSize} examples via real LLM calls
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Intent acc", v: live.metrics.intentAccuracy },
                    { label: "Decision acc", v: live.metrics.decisionAccuracy },
                    { label: "Accept rate", v: live.metrics.acceptableRate },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg bg-card p-2.5 text-center">
                      <div className="text-[10px] text-muted-foreground">{s.label}</div>
                      <div className="text-xl font-bold text-foreground">{Math.round(s.v * 100)}%</div>
                    </div>
                  ))}
                </div>
                <ScrollArea className="mt-3 max-h-64">
                  <div className="space-y-1.5">
                    {live.results.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-md bg-card p-2 text-xs">
                        {r.intentCorrect && r.decisionCorrect ? (
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                        ) : (
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-foreground/80">{r.message}</div>
                          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                            <span>expected: {r.expectedIntentLabel}</span>
                            <span>·</span>
                            <span className={r.intentCorrect ? "text-success" : "text-destructive"}>got: {r.predictedIntentLabel}</span>
                            <span>·</span>
                            <span className={r.decisionCorrect ? "text-success" : "text-destructive"}>{r.predictedDecision}</span>
                            <span>·</span>
                            <span>judge {Math.round(r.judgeOverall * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Baselines table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            Results vs. baselines
          </CardTitle>
          <CardDescription className="text-xs">
            Three configurations on the full golden set. The trivial baseline sets the floor; keyword+rule is the simplest "real" system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="min-w-[760px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Configuration</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Intent acc</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Decision acc</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Decision F1</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Judge accept</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Judge κ</TableHead>
                  <TableHead className="text-right whitespace-nowrap">p50 latency</TableHead>
                  <TableHead className="text-right whitespace-nowrap">False-auto (sensitive)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.baselines.map((b) => {
                  const isAgent = b.name === "Full LLM agent";
                  return (
                    <TableRow key={b.name} className={isAgent ? "bg-primary/5" : ""}>
                      <TableCell>
                        <div className="font-medium text-foreground">{b.name}</div>
                        <div className="text-[10px] text-muted-foreground line-clamp-1">{b.description}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono">{Math.round(b.intentAccuracy * 100)}%</TableCell>
                      <TableCell className="text-right font-mono">{Math.round(b.decisionAccuracy * 100)}%</TableCell>
                      <TableCell className="text-right font-mono">{b.decisionF1.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{Math.round(b.judgeAccept * 100)}%</TableCell>
                      <TableCell className="text-right font-mono">{b.judgeKappa.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono text-xs">{b.p50LatencyMs}ms</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono font-bold ${b.falseAutoOnSensitive === 0 ? "text-success" : "text-destructive"}`}>
                          {b.falseAutoOnSensitive}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Difficulty breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-primary" />
              Accuracy by difficulty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.byDifficulty} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
                <XAxis dataKey="difficulty" tick={{ fontSize: 11, fill: "oklch(0.52 0.012 155)" }} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} tickFormatter={(v) => `${v * 100}%`} />
                <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${Math.round(v * 100)}%`} />
                <Bar dataKey="intentAccuracy" name="Intent acc" fill="oklch(0.62 0.13 162)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="decisionAccuracy" name="Decision acc" fill="oklch(0.7 0.12 180)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="acceptableRate" name="Accept rate" fill="oklch(0.72 0.16 70)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Per-intent accuracy */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Per-intent accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[200px] overflow-y-auto">
              <div className="space-y-1.5">
                {data.perIntent.map((p) => (
                  <div key={p.intent} className="flex items-center gap-2 min-w-0">
                    <div className="w-36 shrink-0 truncate text-xs leading-tight text-foreground/80" title={p.label}>{p.label}</div>
                    <Progress value={(p.accuracy ?? 0) * 100} className="h-2 flex-1 min-w-0" />
                    <div className="w-10 shrink-0 text-right font-mono text-xs font-semibold text-foreground">
                      {p.accuracy !== null ? `${Math.round(p.accuracy * 100)}%` : "—"}
                    </div>
                    <Badge variant="outline" className="w-6 shrink-0 justify-center text-[10px]">{p.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Judge agreement */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Scale className="h-4 w-4 text-primary" />
            LLM-as-judge agreement with humans
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Cohen's κ</div>
              <div className="text-3xl font-bold text-foreground">{data.judgeAgreement.kappa.toFixed(2)}</div>
              <div className="text-[10px] text-muted-foreground">substantial agreement</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3 text-center">
              <div className="text-[11px] text-muted-foreground">Raw agreement</div>
              <div className="text-3xl font-bold text-foreground">{Math.round(data.judgeAgreement.agreementRate * 100)}%</div>
              <div className="text-[10px] text-muted-foreground">{data.judgeAgreement.humanJudgedN} examples</div>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <div className="text-[11px] font-medium text-muted-foreground">Method</div>
              <p className="mt-1 text-[11px] leading-relaxed text-foreground/80">{data.judgeAgreement.method}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mismatches */}
      {data.mismatches.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Intent mismatches ({data.mismatches.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Cases where the agent's predicted intent disagreed with the golden label. These drive the failure analysis.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 overflow-auto rounded-md border border-border/60">
              <div className="divide-y divide-border/40">
                {data.mismatches.map((mm) => (
                  <div key={mm.id} className="flex items-start gap-2 px-3 py-2 pr-3 text-xs min-w-0 overflow-hidden">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="text-foreground/80 line-clamp-2 break-words">"{mm.message}"</div>
                      <div className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        <span className="inline-flex items-center rounded bg-success/8 px-1.5 py-0.5 font-medium text-success" title={`expected: ${mm.expected}`}>
                          <span className="text-success/60">exp:</span>{mm.expected}
                        </span>
                        <span className="inline-flex items-center rounded bg-destructive/8 px-1.5 py-0.5 font-medium text-destructive" title={`predicted: ${mm.predicted}`}>
                          <span className="text-destructive/60">got:</span>{mm.predicted}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
