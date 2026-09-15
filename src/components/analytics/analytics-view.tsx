"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Area,
  AreaChart,
} from "recharts";
import {
  Activity,
  TrendingUp,
  Clock,
  ShieldCheck,
  Tag,
  Gauge,
  AlertTriangle,
  Trophy,
} from "lucide-react";

interface Analytics {
  totals: { conversations: number; analyzed: number; goldenSetSize: number; goldenSetFull: number; intentsCovered: number };
  intentDistribution: { intent: string; label: string; count: number; severity: string }[];
  decision: { autoHandled: number; escalated: number; autoHandleRate: number };
  confidence: { avg: number; p95: number };
  latency: { avg: number; p50: number; p95: number };
  judge: { avgOverall: number; acceptableRate: number };
  intentJudgeTable: { intent: string; label: string; count: number; overall: number; safety: number; groundedness: number }[];
  topSignals: { signal: string; count: number }[];
  baselines: { name: string; intentAccuracy: number; decisionAccuracy: number; decisionF1: number; judgeAccept: number; judgeKappa: number; autoHandleRate: number; p50LatencyMs: number; falseAutoHandleOnSensitive: number }[];
  volumeByHour: { hour: string; incoming: number; escalated: number }[];
}

const SEVERITY_COLOR: Record<string, string> = {
  low: "oklch(0.62 0.13 162)",
  medium: "oklch(0.72 0.16 70)",
  high: "oklch(0.6 0.2 25)",
};

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <Card className="group relative overflow-hidden card-lift">
      {/* gradient wash */}
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />
      <div
        className="absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-[0.08] blur-xl transition-opacity group-hover:opacity-20"
        style={{ background: accent }}
      />
      <CardContent className="relative p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
            style={{ background: `${accent}18`, color: accent }}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5 text-[26px] font-bold leading-none tracking-tight text-foreground">
          {value}
        </div>
        {sub && <div className="mt-1.5 text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

export function AnalyticsView() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => d.ok && setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const decisionPie = [
    { name: "Auto-handled", value: data.decision.autoHandled, color: "oklch(0.62 0.13 162)" },
    { name: "Escalated", value: data.decision.escalated, color: "oklch(0.72 0.16 70)" },
  ];

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="In queue"
          value={String(data.totals.conversations)}
          sub={`${data.totals.analyzed} analyzed`}
          accent="oklch(0.62 0.13 162)"
        />
        <StatCard
          icon={ShieldCheck}
          label="Auto-handle rate"
          value={`${Math.round(data.decision.autoHandleRate * 100)}%`}
          sub={`${data.decision.autoHandled} of ${data.totals.conversations}`}
          accent="oklch(0.7 0.12 180)"
        />
        <StatCard
          icon={Gauge}
          label="Avg confidence"
          value={`${Math.round(data.confidence.avg * 100)}%`}
          sub={`p95 ${Math.round(data.confidence.p95 * 100)}%`}
          accent="oklch(0.72 0.16 70)"
        />
        <StatCard
          icon={Clock}
          label="Median latency"
          value={`${data.latency.p50}ms`}
          sub={`p95 ${data.latency.p95}ms`}
          accent="oklch(0.68 0.17 45)"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Intent distribution */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Tag className="h-4 w-4 text-primary" />
              Intent distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Classified intents across the live queue, colored by severity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.intentDistribution} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "oklch(0.52 0.012 155)" }} angle={-30} textAnchor="end" height={60} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: "oklch(0.52 0.012 155)" }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.9 0.005 150)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {data.intentDistribution.map((d, i) => (
                    <Cell key={i} fill={SEVERITY_COLOR[d.severity] ?? "oklch(0.62 0.13 162)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
              {["low", "medium", "high"].map((s) => (
                <span key={s} className="flex items-center gap-1.5 capitalize">
                  <span className="h-2 w-2 rounded-full" style={{ background: SEVERITY_COLOR[s] }} />
                  {s} severity
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Decision donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Auto-handle vs escalate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={decisionPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {decisionPie.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.9 0.005 150)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 space-y-1">
              {decisionPie.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-mono font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Volume over time */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Inbound volume (last 24h)
            </CardTitle>
            <CardDescription className="text-xs">
              Incoming messages vs escalations, by 2-hour bucket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={data.volumeByHour} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.62 0.13 162)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.62 0.13 162)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gEsc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.72 0.16 70)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.72 0.16 70)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} />
                <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="incoming" stroke="oklch(0.62 0.13 162)" strokeWidth={2} fill="url(#gIn)" />
                <Area type="monotone" dataKey="escalated" stroke="oklch(0.72 0.16 70)" strokeWidth={2} fill="url(#gEsc)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top escalation signals */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-warning" />
              Top escalation signals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topSignals.map((s, i) => {
                const max = data.topSignals[0]?.count ?? 1;
                return (
                  <div key={i}>
                    <div className="mb-0.5 flex items-center justify-between text-xs">
                      <span className="text-foreground/80 truncate pr-2">{s.signal}</span>
                      <span className="font-mono font-semibold text-foreground">{s.count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-warning to-amber-600"
                        style={{ width: `${(s.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Baselines comparison */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Trophy className="h-4 w-4 text-primary" />
            Agent vs baselines
          </CardTitle>
          <CardDescription className="text-xs">
            Headline metrics across the 200-example golden set. The full LLM agent vs. a trivial canned baseline and a keyword+rule baseline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.baselines} margin={{ top: 8, right: 8, bottom: 0, left: -16 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <Tooltip
                contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => `${Math.round(v * 100)}%`}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="intentAccuracy" name="Intent acc" fill="oklch(0.62 0.13 162)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="decisionAccuracy" name="Decision acc" fill="oklch(0.7 0.12 180)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="judgeAccept" name="Judge accept" fill="oklch(0.72 0.16 70)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* False-auto on sensitive — the killer metric */}
          <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              False auto-handles on sensitive intents (money/account security)
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {data.baselines.map((b) => (
                <div key={b.name} className="rounded-md bg-card px-2.5 py-1.5 text-center">
                  <div className="text-[10px] text-muted-foreground truncate">{b.name}</div>
                  <div className={`text-lg font-bold ${b.falseAutoHandleOnSensitive === 0 ? "text-success" : "text-destructive"}`}>
                    {b.falseAutoHandleOnSensitive}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-1.5 text-[10px] text-muted-foreground">
              The full agent is the only configuration with zero costly false auto-handles.
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-intent judge radar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4 text-primary" />
            Per-intent judge quality
          </CardTitle>
          <CardDescription className="text-xs">
            LLM-as-judge scores (overall, safety, groundedness) by intent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={data.intentJudgeTable} outerRadius={100}>
              <PolarGrid stroke="oklch(0.9 0.005 150)" />
              <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fill: "oklch(0.52 0.012 155)" }} />
              <PolarRadiusAxis domain={[0, 1]} tick={{ fontSize: 9, fill: "oklch(0.52 0.012 155)" }} angle={90} />
              <Radar name="Overall" dataKey="overall" stroke="oklch(0.62 0.13 162)" fill="oklch(0.62 0.13 162)" fillOpacity={0.3} />
              <Radar name="Safety" dataKey="safety" stroke="oklch(0.7 0.12 180)" fill="oklch(0.7 0.12 180)" fillOpacity={0.2} />
              <Radar name="Groundedness" dataKey="groundedness" stroke="oklch(0.72 0.16 70)" fill="oklch(0.72 0.16 70)" fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => `${Math.round(v * 100)}%`}
              />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
