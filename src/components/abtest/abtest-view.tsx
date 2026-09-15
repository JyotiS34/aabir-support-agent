"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/lib/store";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import {
  FlaskConical,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Gauge,
  Trophy,
  Info,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/csv";

const THRESHOLDS = [0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8];

interface CostWeights {
  wrongAuto: number;
  humanReview: number;
  goodAuto: number;
}

interface SimResult {
  threshold: number;
  autoHandled: number;
  escalated: number;
  correctAuto: number;
  wrongAuto: number;
  correctEscalate: number;
  overEscalate: number;
  wrongAutoCost: number;
  humanReviewCost: number;
  goodAutoBenefit: number;
  totalCost: number;
}

type Severity = "low" | "medium" | "high";

// Group intents into 4 representative categories for the per-intent cost curves.
type IntentGroup = "status_delivery" | "returns_cancellations" | "damaged_refund" | "payment_account";

const INTENT_GROUP_LABEL: Record<IntentGroup, string> = {
  status_delivery: "Status / Delivery",
  returns_cancellations: "Returns / Cancel",
  damaged_refund: "Damaged / Refund",
  payment_account: "Payment / Account",
};

const INTENT_GROUP_COLOR: Record<IntentGroup, string> = {
  status_delivery: "oklch(0.62 0.13 162)",
  returns_cancellations: "oklch(0.7 0.12 180)",
  damaged_refund: "oklch(0.72 0.16 70)",
  payment_account: "oklch(0.6 0.2 25)",
};

const SAMPLE_DATA: { confidence: number; shouldEscalate: boolean; severity: Severity; intentGroup: IntentGroup }[] = [
  // status/delivery — should NOT escalate (routine)
  { confidence: 0.95, shouldEscalate: false, severity: "low", intentGroup: "status_delivery" },
  { confidence: 0.88, shouldEscalate: false, severity: "low", intentGroup: "status_delivery" },
  { confidence: 0.93, shouldEscalate: false, severity: "medium", intentGroup: "status_delivery" },
  { confidence: 0.90, shouldEscalate: false, severity: "medium", intentGroup: "status_delivery" },
  { confidence: 0.85, shouldEscalate: false, severity: "medium", intentGroup: "status_delivery" },
  // damaged/refund — SHOULD escalate (some high-conf, some borderline)
  { confidence: 0.96, shouldEscalate: true, severity: "high", intentGroup: "damaged_refund" },
  { confidence: 0.58, shouldEscalate: true, severity: "high", intentGroup: "damaged_refund" },   // ← low conf, gets escalated at 0.60
  { confidence: 0.94, shouldEscalate: true, severity: "high", intentGroup: "damaged_refund" },
  { confidence: 0.55, shouldEscalate: true, severity: "high", intentGroup: "damaged_refund" },   // ← low conf
  // returns/cancellations — should NOT escalate
  { confidence: 0.95, shouldEscalate: false, severity: "low", intentGroup: "returns_cancellations" },
  { confidence: 0.84, shouldEscalate: false, severity: "low", intentGroup: "returns_cancellations" },
  { confidence: 0.96, shouldEscalate: false, severity: "medium", intentGroup: "returns_cancellations" },
  { confidence: 0.57, shouldEscalate: false, severity: "medium", intentGroup: "returns_cancellations" }, // ← low conf, causes over-escalation
  // payment/account — SHOULD escalate (mix of high + borderline)
  { confidence: 0.91, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },
  { confidence: 0.59, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },  // ← low conf
  { confidence: 0.94, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },
  { confidence: 0.97, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },
  { confidence: 0.53, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },   // ← low conf
  // more routine (should NOT escalate)
  { confidence: 0.93, shouldEscalate: false, severity: "medium", intentGroup: "returns_cancellations" },
  { confidence: 0.90, shouldEscalate: false, severity: "medium", intentGroup: "returns_cancellations" },
  { confidence: 0.88, shouldEscalate: false, severity: "low", intentGroup: "status_delivery" },
  { confidence: 0.92, shouldEscalate: false, severity: "low", intentGroup: "returns_cancellations" },
  // hard/ambiguous cases
  { confidence: 0.78, shouldEscalate: true, severity: "high", intentGroup: "damaged_refund" },
  { confidence: 0.74, shouldEscalate: true, severity: "high", intentGroup: "damaged_refund" },
  { confidence: 0.68, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },
  { confidence: 0.64, shouldEscalate: true, severity: "high", intentGroup: "payment_account" },
];

function simulate(threshold: number, weights: CostWeights): SimResult {
  let correctAuto = 0, wrongAuto = 0, correctEscalate = 0, overEscalate = 0;
  for (const d of SAMPLE_DATA) {
    const willEscalate = d.confidence < threshold;
    if (willEscalate) {
      if (d.shouldEscalate) correctEscalate++;
      else overEscalate++;
    } else {
      if (d.shouldEscalate) wrongAuto++;
      else correctAuto++;
    }
  }
  const autoHandled = correctAuto + wrongAuto;
  const escalated = correctEscalate + overEscalate;
  const wrongAutoCost = wrongAuto * weights.wrongAuto;
  const humanReviewCost = escalated * weights.humanReview;
  const goodAutoBenefit = correctAuto * weights.goodAuto;
  const totalCost = wrongAutoCost + humanReviewCost + goodAutoBenefit;
  return {
    threshold, autoHandled, escalated,
    correctAuto, wrongAuto, correctEscalate, overEscalate,
    wrongAutoCost, humanReviewCost, goodAutoBenefit, totalCost,
  };
}

// Per-severity breakdown for a given threshold — shows where cost concentrates.
interface SeverityBreakdown {
  severity: Severity;
  count: number;
  wrongAuto: number;
  correctAuto: number;
  escalated: number;
  cost: number;
}

function simulateBySeverity(threshold: number, weights: CostWeights): SeverityBreakdown[] {
  const groups: Record<Severity, SeverityBreakdown> = {
    low: { severity: "low", count: 0, wrongAuto: 0, correctAuto: 0, escalated: 0, cost: 0 },
    medium: { severity: "medium", count: 0, wrongAuto: 0, correctAuto: 0, escalated: 0, cost: 0 },
    high: { severity: "high", count: 0, wrongAuto: 0, correctAuto: 0, escalated: 0, cost: 0 },
  };
  for (const d of SAMPLE_DATA) {
    const g = groups[d.severity];
    g.count++;
    const willEscalate = d.confidence < threshold;
    if (willEscalate) {
      g.escalated++;
      g.cost += weights.humanReview;
    } else if (d.shouldEscalate) {
      g.wrongAuto++;
      g.cost += weights.wrongAuto;
    } else {
      g.correctAuto++;
      g.cost += weights.goodAuto;
    }
  }
  return [groups.low, groups.medium, groups.high];
}

const SEVERITY_STYLE: Record<Severity, { label: string; color: string }> = {
  low: { label: "Low severity", color: "oklch(0.62 0.13 162)" },
  medium: { label: "Medium severity", color: "oklch(0.72 0.16 70)" },
  high: { label: "High severity", color: "oklch(0.6 0.2 25)" },
};

// Compute a per-intent-group cost for a given threshold.
function simulateIntentGroupCost(threshold: number, group: IntentGroup, weights: CostWeights): number {
  let cost = 0;
  for (const d of SAMPLE_DATA) {
    if (d.intentGroup !== group) continue;
    const willEscalate = d.confidence < threshold;
    if (willEscalate) {
      cost += weights.humanReview;
    } else if (d.shouldEscalate) {
      cost += weights.wrongAuto;
    } else {
      cost += weights.goodAuto;
    }
  }
  return cost;
}

// Build the multi-line chart data: for each threshold, the cost of each intent group.
function buildIntentGroupCurveData(weights: CostWeights): { threshold: number; status_delivery: number; returns_cancellations: number; damaged_refund: number; payment_account: number }[] {
  return THRESHOLDS.map((t) => ({
    threshold: t,
    status_delivery: simulateIntentGroupCost(t, "status_delivery", weights),
    returns_cancellations: simulateIntentGroupCost(t, "returns_cancellations", weights),
    damaged_refund: simulateIntentGroupCost(t, "damaged_refund", weights),
    payment_account: simulateIntentGroupCost(t, "payment_account", weights),
  }));
}

export function ABTestView() {
  const [selectedThreshold, setSelectedThreshold] = useState(0.6);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const deployedThreshold = settings.deployedThreshold;
  const costWeights: CostWeights = useMemo(
    () => ({
      wrongAuto: settings.costWrongAuto,
      humanReview: settings.costHumanReview,
      goodAuto: settings.costGoodAuto,
    }),
    [settings.costWrongAuto, settings.costHumanReview, settings.costGoodAuto],
  );

  const handleDeployThreshold = (t: number) => {
    updateSettings({ deployedThreshold: t });
    toast.success(`Threshold ${t.toFixed(2)} deployed`, {
      description: `Updated in Settings · was ${deployedThreshold.toFixed(2)}`,
    });
  };

  const results = useMemo(() => THRESHOLDS.map((t) => simulate(t, costWeights)), [costWeights]);
  const optimal = useMemo(() => results.reduce((min, r) => (r.totalCost < min.totalCost ? r : min), results[0]), [results]);
  const selected = results.find((r) => r.threshold === selectedThreshold) ?? results[0];
  const severityBreakdown = useMemo(
    () => simulateBySeverity(selectedThreshold, costWeights),
    [selectedThreshold, costWeights],
  );
  const intentGroupCurveData = useMemo(
    () => buildIntentGroupCurveData(costWeights),
    [costWeights],
  );
  // Per-intent cost at the selected threshold (for the side table)
  const intentGroupAtSelected = useMemo(() => {
    return (["status_delivery", "returns_cancellations", "damaged_refund", "payment_account"] as IntentGroup[]).map((g) => ({
      group: g,
      label: INTENT_GROUP_LABEL[g],
      color: INTENT_GROUP_COLOR[g],
      cost: simulateIntentGroupCost(selectedThreshold, g, costWeights),
      count: SAMPLE_DATA.filter((d) => d.intentGroup === g).length,
    }));
  }, [selectedThreshold, costWeights]);
  const abCohorts = [0.55, 0.6, 0.65].map((t) => results.find((r) => r.threshold === t)!);

  const handleDeploy = (t: number) => {
    handleDeployThreshold(t);
  };

  return (
    <div className="space-y-5">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
              <FlaskConical className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-foreground">
                Confidence threshold vs. total operating cost
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                We A/B three operating points — <strong>0.55</strong>, <strong>0.60</strong>, <strong>0.65</strong> —
                across the 24-message queue. Lower thresholds auto-handle more (cheaper but riskier);
                higher thresholds escalate more (safer but costlier in human review). The optimal point
                minimizes total cost = (wrong-auto cost) + (human-review cost) − (good-auto benefit).
              </p>
            </div>
          </div>
          {/* What this simulates — the threshold-only caveat */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-warning/25 bg-warning/5 px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
            <div className="text-[11px] leading-relaxed text-foreground/80">
              <span className="font-semibold text-foreground">What this simulates:</span> This A/B isolates
              the <em>confidence threshold's marginal effect</em> alone — it escalates only when{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px]">confidence &lt; threshold</code>.
              The <em>real</em> agent also fires rule signals (intent severity, money/account-security, emotion keywords)
              that escalate regardless of confidence — so in production, wrong-auto counts are far lower than shown here.
              Use this view to tune the threshold on top of those signals, not instead of them.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost weights — unit costs (per message) */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Info className="h-3 w-3" />
              Unit costs (per single message)
            </div>
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary border border-primary/20">
              <span className="h-1 w-1 rounded-full bg-primary animate-pulse" />
              Live from Settings
            </span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-destructive/5 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">Wrong-auto</span>
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <div className="mt-0.5 text-xl font-bold text-destructive">${costWeights.wrongAuto}</div>
              <div className="text-[10px] text-muted-foreground">per wrongly auto-handled sensitive msg</div>
            </div>
            <div className="rounded-lg bg-warning/5 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">Human-review</span>
                <DollarSign className="h-3.5 w-3.5 text-warning" />
              </div>
              <div className="mt-0.5 text-xl font-bold text-warning">${costWeights.humanReview}</div>
              <div className="text-[10px] text-muted-foreground">per escalated message reviewed</div>
            </div>
            <div className="rounded-lg bg-success/5 px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-foreground">Good-auto</span>
                <TrendingDown className="h-3.5 w-3.5 text-success" />
              </div>
              <div className="mt-0.5 text-xl font-bold text-success">${costWeights.goodAuto}</div>
              <div className="text-[10px] text-muted-foreground">saved per correct auto-handle</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-primary" />
            Total cost vs. confidence threshold
          </CardTitle>
          <CardDescription className="text-xs">
            The dip is the optimal operating point.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={results} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
              <XAxis
                dataKey="threshold"
                type="number"
                domain={[0.4, 0.85]}
                ticks={THRESHOLDS}
                tickFormatter={(v) => v.toFixed(2)}
                tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v) => `Threshold ${Number(v).toFixed(2)}`}
                formatter={(v: number, name) => [`$${v}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine x={optimal.threshold} stroke="oklch(0.62 0.13 162)" strokeDasharray="4 4" label={{ value: `optimal ${optimal.threshold.toFixed(2)}`, fontSize: 10, fill: "oklch(0.62 0.13 162)" }} />
              <ReferenceLine x={deployedThreshold} stroke="oklch(0.72 0.16 70)" strokeDasharray="2 2" label={{ value: `deployed ${deployedThreshold.toFixed(2)}`, fontSize: 9, fill: "oklch(0.72 0.16 70)" }} />
              <Line type="monotone" dataKey="totalCost" name="Total cost" stroke="oklch(0.62 0.13 162)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 7, cursor: "pointer" }} />
              <Line type="monotone" dataKey="wrongAutoCost" name="Wrong-auto cost" stroke="oklch(0.6 0.2 25)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              <Line type="monotone" dataKey="humanReviewCost" name="Human-review cost" stroke="oklch(0.72 0.16 70)" strokeWidth={2} strokeDasharray="5 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card id="ab-cohorts-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" />
                A/B cohorts: 0.55 vs 0.60 vs 0.65
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Click a cohort to inspect it below.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                exportToCsv(
                  "aabir-ab-cohorts.csv",
                  results.map((r) => ({
                    threshold: r.threshold.toFixed(2),
                    autoHandled: r.autoHandled,
                    escalated: r.escalated,
                    correctAuto: r.correctAuto,
                    wrongAuto: r.wrongAuto,
                    correctEscalate: r.correctEscalate,
                    overEscalate: r.overEscalate,
                    wrongAutoCost: r.wrongAutoCost,
                    humanReviewCost: r.humanReviewCost,
                    goodAutoBenefit: r.goodAutoBenefit,
                    totalCost: r.totalCost,
                  })),
                );
                toast.success("Exported A/B results", { description: "aabir-ab-cohorts.csv" });
              }}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {abCohorts.map((c) => {
              const isOptimal = c.threshold === optimal.threshold;
              const isSelected = c.threshold === selectedThreshold;
              return (
                <div
                  key={c.threshold}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedThreshold(c.threshold)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedThreshold(c.threshold);
                    }
                  }}
                  className={`relative cursor-pointer rounded-xl border p-4 text-left transition-all ${
                    isOptimal ? "border-success/50 bg-success/5 shadow-sm" : isSelected ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/30"
                  }`}
                >
                  {isOptimal && (
                    <Badge className="absolute right-3 top-3 gap-1 bg-success/15 text-success border border-success/30">
                      <Trophy className="h-2.5 w-2.5" /> Optimal
                    </Badge>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-foreground">{c.threshold.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">threshold</span>
                  </div>
                  <div className="mt-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Auto-handled</span>
                      <span className="font-mono font-semibold text-foreground">{c.autoHandled}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Escalated</span>
                      <span className="font-mono font-semibold text-foreground">{c.escalated}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <AlertTriangle className="h-3 w-3 text-destructive" /> Wrong auto
                      </span>
                      <span className={`font-mono font-bold ${c.wrongAuto > 0 ? "text-destructive" : "text-success"}`}>{c.wrongAuto}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3 text-success" /> Correct auto
                      </span>
                      <span className="font-mono font-semibold text-foreground">{c.correctAuto}</span>
                    </div>
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium text-muted-foreground">Total cost</span>
                      <span className={`text-lg font-bold ${isOptimal ? "text-success" : "text-foreground"}`}>${c.totalCost}</span>
                    </div>
                    {/* Deploy / Deployed badge */}
                    {c.threshold === deployedThreshold ? (
                      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-success/10 py-1.5 text-[11px] font-medium text-success border border-success/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Currently deployed
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeployThreshold(c.threshold);
                        }}
                        className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-[11px] font-medium transition-colors ${
                          isOptimal
                            ? "bg-success/15 text-success border border-success/25 hover:bg-success/25"
                            : "bg-muted text-muted-foreground border border-border hover:bg-accent hover:text-foreground"
                        }`}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {isOptimal ? "Deploy optimal" : "Deploy this"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-primary" />
              Cohort @ {selected.threshold.toFixed(2)} — outcome breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { name: "Correct auto", value: selected.correctAuto, color: "oklch(0.62 0.13 162)" },
                  { name: "Wrong auto", value: selected.wrongAuto, color: "oklch(0.6 0.2 25)" },
                  { name: "Correct escalate", value: selected.correctEscalate, color: "oklch(0.7 0.12 180)" },
                  { name: "Over-escalate", value: selected.overEscalate, color: "oklch(0.72 0.16 70)" },
                ]}
                margin={{ top: 8, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: "oklch(0.52 0.012 155)" }} angle={-15} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {[
                    "oklch(0.62 0.13 162)",
                    "oklch(0.6 0.2 25)",
                    "oklch(0.7 0.12 180)",
                    "oklch(0.72 0.16 70)",
                  ].map((c, i) => (
                    <Cell key={i} fill={c} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              Total cost decomposition @ {selected.threshold.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-destructive/5 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-foreground">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Wrong-auto total
                <span className="text-[10px] text-muted-foreground">({selected.wrongAuto} × ${costWeights.wrongAuto})</span>
              </span>
              <span className="font-mono text-sm font-bold text-destructive">${selected.wrongAutoCost}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-warning/5 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-foreground">
                <DollarSign className="h-3.5 w-3.5 text-warning" /> Human-review total
                <span className="text-[10px] text-muted-foreground">({selected.escalated} × ${costWeights.humanReview})</span>
              </span>
              <span className="font-mono text-sm font-bold text-warning">${selected.humanReviewCost}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-success/5 px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-foreground">
                <TrendingDown className="h-3.5 w-3.5 text-success" /> Good-auto benefit
                <span className="text-[10px] text-muted-foreground">({selected.correctAuto} × ${costWeights.goodAuto})</span>
              </span>
              <span className="font-mono text-sm font-bold text-success">${selected.goodAutoBenefit}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border-2 border-primary/30 bg-primary/5 px-3 py-3">
              <span className="text-xs font-semibold text-foreground">Total operating cost</span>
              <span className="font-mono text-xl font-bold text-primary">${selected.totalCost}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() => handleDeploy(selected.threshold)}
                variant={selected.threshold === deployedThreshold ? "outline" : "default"}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {selected.threshold === deployedThreshold ? "Currently deployed" : `Deploy ${selected.threshold.toFixed(2)}`}
              </Button>
              {optimal.threshold !== selected.threshold && (
                <Button
                  onClick={() => handleDeployThreshold(optimal.threshold)}
                  variant="outline"
                  className="gap-2 border-success/40 text-success hover:bg-success/10"
                >
                  <Trophy className="h-4 w-4" />
                  Deploy optimal {optimal.threshold.toFixed(2)}
                </Button>
              )}
            </div>
            <div className="flex items-start gap-1.5 rounded-md bg-muted/40 p-2.5 text-[10px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                Recommendation: deploy <strong>{optimal.threshold.toFixed(2)}</strong> — it minimizes total cost
                (${optimal.totalCost} / 24 msgs) with {optimal.wrongAuto} wrong-auto handles.
                Currently deployed: <strong className="text-primary">{deployedThreshold.toFixed(2)}</strong>.
                In production, re-run this A/B nightly and hot-swap via Edge Config.
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-severity cost breakdown — shows where cost concentrates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-primary" />
            Cost by intent severity @ {selected.threshold.toFixed(2)}
          </CardTitle>
          <CardDescription className="text-xs">
            Where total cost concentrates. High-severity wrong-autos are the costly direction — tune the threshold to drive these to zero first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {severityBreakdown.map((sb) => {
              const style = SEVERITY_STYLE[sb.severity];
              const maxCost = Math.max(...severityBreakdown.map((s) => Math.abs(s.cost)), 1);
              return (
                <div
                  key={sb.severity}
                  className="rounded-xl border p-3.5"
                  style={{ borderColor: `${style.color}30`, background: `${style.color}08` }}
                >
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: style.color }} />
                      {style.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{sb.count} msgs</span>
                  </div>
                  <div className="mt-2 text-2xl font-bold tabular-nums" style={{ color: sb.cost < 0 ? "oklch(0.62 0.13 162)" : sb.cost > 0 ? "oklch(0.6 0.2 25)" : "oklch(0.55 0.01 150)" }}>
                    {sb.cost < 0 ? "−" : ""}${Math.abs(sb.cost)}
                  </div>
                  {/* cost bar */}
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(Math.abs(sb.cost) / maxCost) * 100}%`,
                        background: sb.cost < 0 ? "oklch(0.62 0.13 162)" : style.color,
                      }}
                    />
                  </div>
                  <div className="mt-2.5 space-y-1 text-[10px] text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Correct auto</span>
                      <span className="font-mono font-semibold text-success">{sb.correctAuto}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Escalated</span>
                      <span className="font-mono font-semibold text-warning-foreground">{sb.escalated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Wrong auto</span>
                      <span className={`font-mono font-bold ${sb.wrongAuto > 0 ? "text-destructive" : "text-muted-foreground"}`}>{sb.wrongAuto}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Per-intent cost curves — multi-line chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <TrendingDown className="h-4 w-4 text-primary" />
            Cost by intent group vs. threshold
          </CardTitle>
          <CardDescription className="text-xs">
            Each line is an intent group's total cost across thresholds. Payment/Account dominates at low thresholds — tune for the group that costs you most.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={intentGroupCurveData} margin={{ top: 8, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
              <XAxis
                dataKey="threshold"
                type="number"
                domain={[0.4, 0.85]}
                ticks={THRESHOLDS}
                tickFormatter={(v) => v.toFixed(2)}
                tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }}
              />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }}
                labelFormatter={(v) => `Threshold ${Number(v).toFixed(2)}`}
                formatter={(v: number, name) => [`$${v}`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine x={selectedThreshold} stroke="oklch(0.62 0.13 162)" strokeDasharray="3 3" label={{ value: `selected ${selectedThreshold.toFixed(2)}`, fontSize: 9, fill: "oklch(0.62 0.13 162)" }} />
              <Line type="monotone" dataKey="status_delivery" name={INTENT_GROUP_LABEL.status_delivery} stroke={INTENT_GROUP_COLOR.status_delivery} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="returns_cancellations" name={INTENT_GROUP_LABEL.returns_cancellations} stroke={INTENT_GROUP_COLOR.returns_cancellations} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="damaged_refund" name={INTENT_GROUP_LABEL.damaged_refund} stroke={INTENT_GROUP_COLOR.damaged_refund} strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="payment_account" name={INTENT_GROUP_LABEL.payment_account} stroke={INTENT_GROUP_COLOR.payment_account} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
          {/* Per-intent cost at selected threshold — side strip */}
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {intentGroupAtSelected.map((g) => (
              <div
                key={g.group}
                className="rounded-lg border p-2.5"
                style={{ borderColor: `${g.color}30`, background: `${g.color}06` }}
              >
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ background: g.color }} />
                  {g.label}
                </div>
                <div className="mt-1 text-lg font-bold tabular-nums" style={{ color: g.cost < 0 ? "oklch(0.62 0.13 162)" : g.cost > 0 ? g.color : "oklch(0.55 0.01 150)" }}>
                  {g.cost < 0 ? "−" : ""}${Math.abs(g.cost)}
                </div>
                <div className="text-[9px] text-muted-foreground">{g.count} msgs</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sortable threshold comparison table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            All thresholds — comparison table
          </CardTitle>
          <CardDescription className="text-xs">
            Every simulated threshold with its outcome metrics. Click a column header to sort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThresholdTable
            results={results}
            selectedThreshold={selectedThreshold}
            deployedThreshold={deployedThreshold}
            onSelect={(t) => {
              setSelectedThreshold(t);
              // Scroll to the cohorts card so the user sees the selection highlight
              setTimeout(() => {
                document.getElementById("ab-cohorts-card")?.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 50);
            }}
            onDeploy={handleDeployThreshold}
          />
        </CardContent>
      </Card>
    </div>
  );
}

// Sortable threshold comparison table — reusable component.
function ThresholdTable({
  results,
  selectedThreshold,
  deployedThreshold,
  onSelect,
  onDeploy,
}: {
  results: SimResult[];
  selectedThreshold: number;
  deployedThreshold: number;
  onSelect: (t: number) => void;
  onDeploy: (t: number) => void;
}) {
  type SortKey = "threshold" | "totalCost" | "wrongAuto" | "autoHandled" | "escalated";
  const [sortKey, setSortKey] = useState<SortKey>("threshold");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const sorted = useMemo(() => {
    const arr = [...results];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [results, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "threshold" ? "asc" : "desc");
    }
  };

  // Plain render helper (not a component) for the sort indicator
  const sortIndicator = (k: SortKey) =>
    sortKey === k ? <span className="text-primary">{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none text-[10px] uppercase tracking-wider"
              onClick={() => toggleSort("threshold")}
            >
              <span className="inline-flex items-center gap-1">Threshold {sortIndicator("threshold")}</span>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-right"
              onClick={() => toggleSort("totalCost")}
            >
              <span className="inline-flex items-center gap-1">Total $ {sortIndicator("totalCost")}</span>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-right"
              onClick={() => toggleSort("wrongAuto")}
            >
              <span className="inline-flex items-center gap-1">Wrong auto {sortIndicator("wrongAuto")}</span>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-right"
              onClick={() => toggleSort("autoHandled")}
            >
              <span className="inline-flex items-center gap-1">Auto {sortIndicator("autoHandled")}</span>
            </TableHead>
            <TableHead
              className="cursor-pointer select-none text-[10px] uppercase tracking-wider text-right"
              onClick={() => toggleSort("escalated")}
            >
              <span className="inline-flex items-center gap-1">Escalated {sortIndicator("escalated")}</span>
            </TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => {
            const isSelected = r.threshold === selectedThreshold;
            const isDeployed = r.threshold === deployedThreshold;
            const isOptimal = r.totalCost === Math.min(...results.map((x) => x.totalCost));
            return (
              <TableRow
                key={r.threshold}
                className={cn(
                  "cursor-pointer transition-colors",
                  isSelected ? "bg-primary/5" : "hover:bg-muted/40",
                )}
                onClick={() => onSelect(r.threshold)}
              >
                <TableCell className="font-mono font-semibold">
                  <span className="flex items-center gap-1.5">
                    {r.threshold.toFixed(2)}
                    {isOptimal && (
                      <Badge className="bg-success/15 text-success border border-success/30 text-[9px] gap-0.5 px-1">
                        <Trophy className="h-2 w-2" /> optimal
                      </Badge>
                    )}
                    {isDeployed && (
                      <Badge className="bg-primary/15 text-primary border border-primary/30 text-[9px] gap-0.5 px-1">
                        deployed
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell className={cn("text-right font-mono font-bold", r.totalCost < 0 ? "text-success" : "text-foreground")}>
                  ${r.totalCost}
                </TableCell>
                <TableCell className={cn("text-right font-mono", r.wrongAuto > 0 ? "text-destructive font-bold" : "text-muted-foreground")}>
                  {r.wrongAuto}
                </TableCell>
                <TableCell className="text-right font-mono">{r.autoHandled}</TableCell>
                <TableCell className="text-right font-mono text-warning-foreground">{r.escalated}</TableCell>
                <TableCell className="text-right">
                  {isDeployed ? (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeploy(r.threshold);
                      }}
                      className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-foreground hover:border-primary/40 hover:bg-accent"
                    >
                      Deploy
                    </button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
