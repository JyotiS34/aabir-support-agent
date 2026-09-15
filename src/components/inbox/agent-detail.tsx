"use client";

import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConfidenceMeter, DecisionBadge, IntentBadge, RiskChip, SentimentBadge } from "@/components/agent-panel/badges";
import { getIntent } from "@/lib/agent/intents";
import type { AgentAnalysis } from "@/lib/agent";
import {
  Copy,
  Check,
  RefreshCw,
  User,
  Tag,
  MessageSquareText,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Clock,
  Cpu,
  ListTree,
  ChevronRight,
  AlertTriangle,
  Smile,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface SelectedMessage {
  tweetId: string;
  customerHandle: string;
  customerName: string;
  message: string;
  threadContext?: string[];
  occurredAt: string;
  expectedIntent: string;
  expectedDecision: "auto-handle" | "escalate";
  difficulty: "easy" | "medium" | "hard";
  analysis?: AgentAnalysis & { intentLabel?: string; intentSeverity?: string };
}

export function AgentDetail({ message }: { message: SelectedMessage }) {
  const [liveAnalysis, setLiveAnalysis] = useState<AgentAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const analysis = liveAnalysis ?? message.analysis;
  const isLive = !!liveAnalysis;

  const handleReanalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message.message,
          customerName: message.customerName,
          threadContext: message.threadContext,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setLiveAnalysis(data.analysis);
        toast.success("Live analysis complete", {
          description: `${data.analysis.latencyMs}ms · zai-llm-v1`,
        });
      } else {
        toast.error("Analysis failed", { description: data.error });
      }
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "" });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis.draftReply);
    setCopied(true);
    toast.success("Reply copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!analysis) {
    return <AgentAnalysisSkeleton />;
  }

  const intent = getIntent(analysis.intent);

  return (
    <div className="space-y-4">
      {/* Customer message */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-xs font-bold text-white">
                {message.customerName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <CardTitle className="text-sm">{message.customerHandle}</CardTitle>
                <CardDescription className="text-xs">{message.customerName}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] capitalize">{message.difficulty}</Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <User className="h-2.5 w-2.5" /> Customer
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {message.threadContext && message.threadContext.length > 0 && (
            <div className="mb-3 rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-2.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <MessageSquareText className="h-3 w-3 text-primary" />
                Conversation thread ({message.threadContext.length + 1} turns)
              </div>
              {/* Timeline */}
              <div className="space-y-0">
                {message.threadContext.map((t, i) => (
                  <div key={i} className="flex gap-2.5">
                    {/* timeline rail */}
                    <div className="flex flex-col items-center">
                      <div className="mt-1 h-2 w-2 rounded-full border-2 border-primary/40 bg-card" />
                      {i < message.threadContext!.length - 0 && (
                        <div className="w-px flex-1 bg-border min-h-[20px]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground">Customer</span>
                        <span className="text-[9px] text-muted-foreground/60">· turn {i + 1}</span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-foreground/75">{t}</p>
                    </div>
                  </div>
                ))}
                {/* Current message (latest turn) */}
                <div className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div className="mt-1 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-primary/20" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-semibold text-primary">Customer</span>
                      <span className="text-[9px] text-primary/70">· current turn</span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed font-medium text-foreground">
                      {message.message}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {(!message.threadContext || message.threadContext.length === 0) && (
            <div className="mb-3 rounded-lg border border-border bg-card p-3">
              <p className="text-sm leading-relaxed text-foreground">{message.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Live re-analyze bar */}
      <div className="flex items-center justify-between rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3.5 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">
            {isLive ? "Live LLM analysis" : "Cached analysis"}
          </span>
          <span className="text-muted-foreground">
            · {analysis.latencyMs}ms · {analysis.modelId}
          </span>
        </div>
        <Button
          size="sm"
          variant={isLive ? "outline" : "default"}
          onClick={handleReanalyze}
          disabled={analyzing}
          className="gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${analyzing ? "animate-spin" : ""}`} />
          {analyzing ? "Analyzing…" : isLive ? "Re-run" : "Run live"}
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={isLive ? "live" : "cached"}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="space-y-4"
        >
          {/* Intent classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-primary" />
                Intent Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <IntentBadge intentId={analysis.intent} />
                {intent && (
                  <Badge variant="outline" className="text-[10px] capitalize gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${intent.severity === "low" ? "bg-success" : intent.severity === "medium" ? "bg-warning" : "bg-destructive"}`} />
                    {intent.severity} severity
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Cpu className="h-3 w-3" /> {analysis.modelId}
                </div>
              </div>
              <ConfidenceMeter value={analysis.intentConfidence} label="Classifier confidence" />
              <div className="rounded-lg bg-muted/40 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Reasoning
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">
                  {analysis.intentReasoning}
                </p>
              </div>
              {analysis.alternativeIntents.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <ListTree className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Alternatives:</span>
                  {analysis.alternativeIntents.map((alt) => (
                    <IntentBadge key={alt} intentId={alt} size="sm" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sentiment (fine-tuned aabir-sentiment-v1) */}
          {analysis.sentiment && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Smile className="h-4 w-4 text-primary" />
                  Customer Sentiment
                  <Badge variant="outline" className="ml-auto text-[10px] gap-1 font-normal">
                    <Cpu className="h-2.5 w-2.5" />
                    {analysis.sentiment.modelId}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SentimentBadge sentiment={analysis.sentiment} />
                  <span className="text-[11px] text-muted-foreground">
                    escalation weight {Math.round(analysis.sentiment.escalationWeight * 100)}%
                  </span>
                </div>
                <ConfidenceMeter
                  value={analysis.sentiment.intensity}
                  label="Sentiment intensity"
                />
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Why this label
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">
                    {analysis.sentiment.reasoning}
                  </p>
                </div>
                {analysis.sentiment.escalationWeight >= 0.4 && (
                  <div className="flex items-center gap-1.5 rounded-md bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    High-emotion sentiment contributed to the escalation decision.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Draft reply */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <MessageSquareText className="h-4 w-4 text-primary" />
                  Drafted Reply
                </CardTitle>
                <Button size="sm" variant="ghost" className="h-7 gap-1.5 text-xs" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative rounded-lg border border-primary/25 bg-gradient-to-br from-primary/8 to-primary/3 p-3.5 accent-border-left">
                <div className="absolute right-2 top-2 flex items-center gap-1 text-[9px] font-medium text-primary/70">
                  <MessageSquareText className="h-2.5 w-2.5" />
                  DRAFT
                </div>
                <p className="pr-12 text-sm leading-relaxed text-foreground">{analysis.draftReply}</p>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="font-mono">{analysis.draftReply.length}/280</span>
                  <span>·</span>
                  <span className="font-mono">{analysis.draftConfidence.toFixed(2)} conf</span>
                </div>
              </div>
              <ConfidenceMeter value={analysis.draftConfidence} label="Drafter confidence" />
              <div>
                <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Grounded in
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.groundedIn.map((g, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] font-normal bg-muted">
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Decision */}
          <Card className={analysis.decision === "escalate" ? "border-warning/40" : "border-success/30"}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                {analysis.decision === "escalate" ? (
                  <ShieldAlert className="h-4 w-4 text-warning" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-success" />
                )}
                Escalation Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <DecisionBadge decision={analysis.decision} />
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" /> {analysis.latencyMs}ms total
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Reason
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">
                  {analysis.decisionReason}
                </p>
              </div>
              {analysis.escalationSignals.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertTriangle className="h-3 w-3" />
                    Signals detected ({analysis.escalationSignals.length})
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.escalationSignals.map((s, i) => (
                      <RiskChip key={i}>{s}</RiskChip>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function AgentAnalysisSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
        <Skeleton className="mt-3 h-16 w-full" />
      </Card>
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-12 w-full" />
      </Card>
      <Card className="p-4 space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-2 w-full" />
      </Card>
    </div>
  );
}
