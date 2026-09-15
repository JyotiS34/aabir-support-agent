"use client";

import { cn } from "@/lib/utils";
import { getIntent } from "@/lib/agent/intents";
import { SENTIMENT_META, type SentimentLabel, type SentimentResult } from "@/lib/agent/sentiment-types";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, AlertTriangle, Smile } from "lucide-react";

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-success/10 text-success border-success/25",
  medium: "bg-warning/10 text-warning-foreground border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/25",
};

export function IntentBadge({ intentId, size = "default" }: { intentId: string; size?: "default" | "sm" }) {
  const intent = getIntent(intentId);
  if (!intent) {
    return <Badge variant="outline" className={size === "sm" ? "text-[10px]" : ""}>{intentId}</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1 font-medium border",
        SEVERITY_STYLES[intent.severity],
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs",
      )}
    >
      {intent.label}
    </Badge>
  );
}

export function SeverityDot({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        severity === "low" && "bg-success",
        severity === "medium" && "bg-warning",
        severity === "high" && "bg-destructive",
      )}
      title={`${severity} severity`}
    />
  );
}

export function DecisionBadge({ decision }: { decision: "auto-handle" | "escalate" }) {
  if (decision === "auto-handle") {
    return (
      <Badge className="gap-1 bg-success/10 text-success border border-success/25 hover:bg-success/15">
        <ShieldCheck className="h-3 w-3" />
        Auto-handle
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 bg-warning/10 text-warning-foreground border border-warning/30 hover:bg-warning/15">
      <ShieldAlert className="h-3 w-3" />
      Escalate
    </Badge>
  );
}

export function ConfidenceMeter({ value, label }: { value: number; label?: string }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.8 ? "bg-success" : value >= 0.6 ? "bg-warning" : "bg-destructive";
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-[11px]">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono font-semibold text-foreground">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function RiskChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-destructive/8 px-1.5 py-0.5 text-[10px] font-medium text-destructive border border-destructive/20">
      <AlertTriangle className="h-2.5 w-2.5" />
      {children}
    </span>
  );
}

// Sentiment badge — shows the fine-tuned aabir-sentiment-v1 label + intensity.
export function SentimentBadge({ sentiment, size = "default" }: { sentiment: SentimentResult | null; size?: "default" | "sm" }) {
  if (!sentiment) return null;
  const meta = SENTIMENT_META[sentiment.label as SentimentLabel];
  if (!meta) return null;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium border", size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs")}
      style={{ color: meta.color, borderColor: `${meta.color}40`, background: `${meta.color}12` }}
      title={sentiment.reasoning}
    >
      <Smile className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {meta.label}
      <span className="font-mono opacity-70">{Math.round(sentiment.intensity * 100)}%</span>
    </Badge>
  );
}
