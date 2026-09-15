"use client";

import { useState, useRef, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfidenceMeter, DecisionBadge, IntentBadge, RiskChip, SentimentBadge } from "@/components/agent-panel/badges";
import type { AgentAnalysis, JudgeResult } from "@/lib/agent";
import { getIntent } from "@/lib/agent/intents";
import {
  Sparkles,
  Send,
  Loader2,
  Wand2,
  Copy,
  Check,
  Gauge,
  ShieldCheck,
  ShieldAlert,
  Tag,
  MessageSquareText,
  AlertTriangle,
  Scale,
  Smile,
  Cpu,
  RotateCcw,
  MessagesSquare,
  CornerDownLeft,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { exportToCsv } from "@/lib/csv";

const SAMPLE_PROMPTS = [
  "Where is my order? Order #112-8847261",
  "You charged me twice for the same order, I want my money back NOW!",
  "My TV arrived with a cracked screen, this is unacceptable",
  "How do I cancel my Prime membership?",
  "Been locked out of my account for 2 days, reset email never comes",
  "App keeps crashing when I open my cart on iPhone",
];

interface Turn {
  id: string;
  role: "customer" | "agent";
  text: string;
  analysis?: AgentAnalysis;
  loading?: boolean;
}

export function PlaygroundView() {
  const [message, setMessage] = useState("");
  const [customerName, setCustomerName] = useState("there");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [judge, setJudge] = useState<JudgeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [judging, setJudging] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [customSentiment, setCustomSentiment] = useState<{
    label: string;
    score: number;
    probs: Record<string, number>;
    escalationWeight: number;
    modelId: string;
    latencyMs: number;
  } | null>(null);
  const [customLoading, setCustomLoading] = useState(false);
  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Persist conversation + customer name to localStorage
  const STORAGE_KEY = "aabir-playground-thread";
  const NAME_KEY = "aabir-playground-name";

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const rawName = window.localStorage.getItem(NAME_KEY);
      if (rawName) setCustomerName(rawName);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Turn[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTurns(parsed);
          toast.info("Conversation restored", { description: `${parsed.filter((t) => t.role === "customer").length} turns` });
        }
      }
    } catch {
      /* ignore parse errors */
    }
  }, []);

  // Save turns to localStorage whenever they change
  useEffect(() => {
    try {
      if (turns.length === 0) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(turns));
      }
    } catch {
      /* ignore quota errors */
    }
  }, [turns]);

  // Save customer name
  useEffect(() => {
    try {
      window.localStorage.setItem(NAME_KEY, customerName);
    } catch {
      /* ignore */
    }
  }, [customerName]);

  // Auto-scroll the thread to the bottom when new turns arrive
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  // Auto-focus the input on mount + when loading finishes
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading]);

  // Global keyboard shortcuts (active only on the Playground view):
  //   "/" → focus the message textarea
  //   "⌘E" / "Ctrl+E" → export the conversation as JSON
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      const inField = tag === "input" || tag === "textarea";
      // "/" focuses the input (unless already typing in a field)
      if (e.key === "/" && !inField && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      // ⌘E / Ctrl+E exports the conversation as JSON
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "e") {
        e.preventDefault();
        if (turns.length > 0) {
          handleExportJson();
        } else {
          toast.error("Nothing to export yet");
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [turns]);

  // The latest agent turn's analysis drives the side panel
  const lastAgentTurn = [...turns].reverse().find((t) => t.role === "agent" && t.analysis);
  const analysis = lastAgentTurn?.analysis ?? null;

  const handleAnalyze = async (msg?: string) => {
    const text = (msg ?? message).trim();
    if (!text) {
      toast.error("Please enter a message");
      return;
    }
    if (msg) setMessage(msg);

    const customerId = `c-${Date.now()}`;
    const customerTurn: Turn = { id: customerId, role: "customer", text };
    setTurns((prev) => [...prev, customerTurn]);
    setMessage("");
    setLoading(true);
    setJudge(null);

    // Build thread context from prior customer messages
    const threadContext = turns
      .filter((t) => t.role === "customer")
      .map((t) => t.text);

    try {
      const res = await fetch("/api/agent/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, customerName, threadContext }),
      });
      const data = await res.json();
      if (data.ok) {
        const agentTurn: Turn = {
          id: `a-${Date.now()}`,
          role: "agent",
          text: data.analysis.draftReply,
          analysis: data.analysis,
        };
        setTurns((prev) => [...prev, agentTurn]);
        toast.success("Agent replied", { description: `${data.analysis.latencyMs}ms · turn ${threadContext.length + 1}` });
      } else {
        toast.error("Analysis failed", { description: data.error });
      }
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "" });
    } finally {
      setLoading(false);
    }
  };

  const handleJudge = async () => {
    if (!analysis) return;
    const lastCustomerText = [...turns].reverse().find((t) => t.role === "customer")?.text ?? "";
    setJudging(true);
    try {
      const res = await fetch("/api/eval/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: lastCustomerText,
          intent: analysis.intent,
          reply: analysis.draftReply,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setJudge(data.judge);
        toast.success("Judge scored the reply");
      } else {
        toast.error("Judge failed", { description: data.error });
      }
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "" });
    } finally {
      setJudging(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  // Call the custom fine-tuned BERT sentiment model for comparison
  const handleCustomSentiment = async () => {
    const lastCustomerText = [...turns].reverse().find((t) => t.role === "customer")?.text ?? "";
    if (!lastCustomerText) {
      toast.error("No customer message to analyze");
      return;
    }
    setCustomLoading(true);
    setCustomSentiment(null);
    try {
      const res = await fetch("/api/sentiment/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: lastCustomerText }),
      });
      const data = await res.json();
      if (data.ok) {
        setCustomSentiment(data.sentiment);
        toast.success("Custom BERT model scored the sentiment");
      } else {
        toast.error("Custom model failed", { description: data.error });
      }
    } catch (e) {
      toast.error("Network error", { description: e instanceof Error ? e.message : "" });
    } finally {
      setCustomLoading(false);
    }
  };

  const handleClear = () => {
    setTurns([]);
    setJudge(null);
    setMessage("");
    toast.success("Conversation cleared");
  };

  const handleExportJson = () => {
    if (turns.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const payload = {
      customerName,
      exportedAt: new Date().toISOString(),
      turns: turns.map((t) => ({
        role: t.role,
        text: t.text,
        ...(t.analysis
          ? {
              intent: t.analysis.intent,
              intentConfidence: t.analysis.intentConfidence,
              decision: t.analysis.decision,
              sentiment: t.analysis.sentiment?.label,
              latencyMs: t.analysis.latencyMs,
            }
          : {}),
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aabir-conversation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Conversation exported", { description: `${turns.length} turns (JSON)` });
  };

  const handleExportCsv = () => {
    if (turns.length === 0) {
      toast.error("Nothing to export");
      return;
    }
    const rows = turns.map((t, i) => ({
      turn: i + 1,
      role: t.role,
      speaker: t.role === "customer" ? customerName : "Aabir agent",
      message: t.text,
      intent: t.analysis?.intent ?? "",
      intentConfidence: t.analysis?.intentConfidence?.toFixed(2) ?? "",
      decision: t.analysis?.decision ?? "",
      sentiment: t.analysis?.sentiment?.label ?? "",
      latencyMs: t.analysis?.latencyMs ?? "",
    }));
    exportToCsv(`aabir-conversation-${Date.now()}.csv`, rows);
    toast.success("Conversation exported", { description: `${turns.length} turns (CSV)` });
  };

  // Replay: re-run the agent on every customer message in the conversation,
  // preserving the original customer turns but regenerating agent replies.
  // Useful for re-evaluating after model changes or threshold tweaks.
  const [replaying, setReplaying] = useState(false);
  const [replayProgress, setReplayProgress] = useState<{ current: number; total: number } | null>(null);
  const handleReplay = async () => {
    const customerTurns = turns.filter((t) => t.role === "customer");
    if (customerTurns.length === 0) {
      toast.error("Nothing to replay");
      return;
    }
    setReplaying(true);
    setReplayProgress({ current: 0, total: customerTurns.length });
    toast.info("Replaying conversation", { description: `${customerTurns.length} customer turns` });
    // Keep only customer turns, drop old agent replies
    const newTurns: Turn[] = customerTurns.map((t) => ({ ...t, analysis: undefined }));
    setTurns(newTurns);
    setJudge(null);
    // Re-run the agent on each customer message sequentially, building up thread context
    for (let i = 0; i < customerTurns.length; i++) {
      setReplayProgress({ current: i + 1, total: customerTurns.length });
      const text = customerTurns[i].text;
      const threadContext = customerTurns.slice(0, i).map((t) => t.text);
      try {
        const res = await fetch("/api/agent/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, customerName, threadContext }),
        });
        const data = await res.json();
        if (data.ok) {
          const agentTurn: Turn = {
            id: `a-replay-${Date.now()}-${i}`,
            role: "agent",
            text: data.analysis.draftReply,
            analysis: data.analysis,
          };
          // Insert after the i-th customer turn
          setTurns((prev) => {
            const updated = [...prev];
            const customerIdx = updated.findIndex((t) => t.id === customerTurns[i].id);
            if (customerIdx >= 0) {
              updated.splice(customerIdx + 1, 0, agentTurn);
            }
            return updated;
          });
        }
      } catch {
        /* skip failed turns */
      }
    }
    setReplaying(false);
    setReplayProgress(null);
    toast.success("Replay complete", { description: `${customerTurns.length} turns re-evaluated` });
  };

  const intent = analysis ? getIntent(analysis.intent) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1fr]">
      {/* Left: conversation thread + input */}
      <div className="space-y-4">
        {/* Conversation thread */}
        <Card className="flex flex-col" style={{ minHeight: 320 }}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MessagesSquare className="h-4 w-4 text-primary" />
                Conversation
                {turns.length > 0 && (
                  <Badge variant="outline" className="text-[10px]">
                    {turns.filter((t) => t.role === "customer").length} turns
                  </Badge>
                )}
              </CardTitle>
              {turns.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleReplay}
                    disabled={replaying || loading}
                    className="h-7 gap-1.5 text-xs"
                    title="Re-run the agent on all customer messages"
                  >
                    {replaying ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    <span className="hidden sm:inline">
                      {replaying && replayProgress
                        ? `Replaying ${replayProgress.current}/${replayProgress.total}…`
                        : "Replay"}
                    </span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleExportJson} className="h-7 gap-1.5 text-xs" title="Export as JSON">
                    <FileJson className="h-3 w-3" />
                    <span className="hidden sm:inline">JSON</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleExportCsv} className="h-7 gap-1.5 text-xs" title="Export as CSV">
                    <FileSpreadsheet className="h-3 w-3" />
                    <span className="hidden sm:inline">CSV</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleClear} className="h-7 gap-1.5 text-xs">
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Clear</span>
                  </Button>
                </div>
              )}
            </div>
            <CardDescription className="text-xs">
              Multi-turn — the agent remembers prior context and won't re-ask for your order number.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {/* Replay progress bar */}
            {replaying && replayProgress && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-2.5">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-medium text-primary">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Replaying turn {replayProgress.current} of {replayProgress.total}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    {Math.round((replayProgress.current / replayProgress.total) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${(replayProgress.current / replayProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {turns.length === 0 && !loading && (
              <div className="flex h-48 flex-col items-center justify-center gap-2 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <MessagesSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-medium text-foreground">Start a conversation</div>
                <div className="text-xs text-muted-foreground">Type a message below or pick a sample.</div>
              </div>
            )}
            <AnimatePresence initial={false}>
              {turns.map((turn) => (
                <motion.div
                  key={turn.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={cn("flex gap-2.5", turn.role === "customer" ? "flex-row" : "flex-row-reverse")}
                >
                  {/* avatar */}
                  <div
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm",
                      turn.role === "customer"
                        ? "bg-gradient-to-br from-amber-400 to-orange-500"
                        : "bg-gradient-to-br from-primary to-emerald-700",
                    )}
                  >
                    {turn.role === "customer" ? customerName.slice(0, 2).toUpperCase() : "A"}
                  </div>
                  {/* bubble */}
                  <div className={cn("group min-w-0 flex-1", turn.role === "agent" && "flex flex-col items-end")}>
                    <div className="mb-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="font-medium">{turn.role === "customer" ? customerName : "Aabir agent"}</span>
                      {turn.analysis && (
                        <span className="text-primary/70">· {turn.analysis.latencyMs}ms</span>
                      )}
                    </div>
                    <div
                      className={cn(
                        "relative max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                        turn.role === "customer"
                          ? "bg-muted/60 text-foreground rounded-tl-sm"
                          : "bg-primary/8 border border-primary/20 text-foreground rounded-tr-sm accent-border-left",
                      )}
                    >
                      {turn.text}
                      {turn.role === "agent" && (
                        <button
                          onClick={() => handleCopy(turn.text, turn.id)}
                          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card shadow-sm opacity-0 transition-opacity group-hover:opacity-100"
                          aria-label="Copy reply"
                        >
                          {copied === turn.id ? <Check className="h-2.5 w-2.5 text-success" /> : <Copy className="h-2.5 w-2.5" />}
                        </button>
                      )}
                    </div>
                    {/* per-turn intent badge for agent turns */}
                    {turn.analysis && (
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <IntentBadge intentId={turn.analysis.intent} size="sm" />
                        {turn.analysis.sentiment && (
                          <SentimentBadge sentiment={turn.analysis.sentiment} size="sm" />
                        )}
                        <DecisionBadge decision={turn.analysis.decision} />
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {/* loading indicator */}
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-row-reverse gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-700 text-[10px] font-bold text-white">
                  A
                </div>
                <div className="rounded-lg bg-primary/8 border border-primary/20 px-3 py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                </div>
              </motion.div>
            )}
            <div ref={threadEndRef} />
          </CardContent>
        </Card>

        {/* Input */}
        <Card>
          <CardContent className="space-y-3 p-4">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Customer name (for personalization)
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Jenny"
                className="bg-card"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
                Message
              </label>
              <Textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a customer message to @AmazonHelp…"
                className="min-h-[88px] resize-y bg-card"
                onKeyDown={(e) => {
                  // Plain Enter sends; Shift+Enter inserts a newline
                  if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
                    e.preventDefault();
                    handleAnalyze();
                  } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleAnalyze();
                  }
                }}
              />
              <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{message.length} chars</span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-2.5 w-2.5" /> Enter to send · Shift+Enter for newline
                </span>
              </div>
            </div>
            <Button
              onClick={() => handleAnalyze()}
              disabled={loading || !message.trim()}
              className="w-full gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agent is thinking…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Send message
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sample prompts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-primary" />
              Try a sample
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {SAMPLE_PROMPTS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleAnalyze(p)}
                disabled={loading}
                className="block w-full rounded-lg border border-border bg-card px-3 py-2 text-left text-xs text-foreground/80 transition-colors hover:border-primary/40 hover:bg-accent/40 disabled:opacity-50"
              >
                <span className="line-clamp-1">{p}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Right: latest analysis */}
      <div className="space-y-4">
        {!analysis && !loading && (
          <Card className="flex h-64 flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">No analysis yet</div>
              <div className="text-xs text-muted-foreground">
                Send a message to see the agent's intent, sentiment & decision.
              </div>
            </div>
          </Card>
        )}

        <AnimatePresence mode="wait">
          {analysis && (
            <motion.div
              key={analysis.draftReply}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              {/* Intent */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Tag className="h-4 w-4 text-primary" />
                    Intent
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <IntentBadge intentId={analysis.intent} />
                    {intent && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {intent.severity} severity
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Gauge className="h-2.5 w-2.5" /> {analysis.latencyMs}ms
                    </Badge>
                  </div>
                  <ConfidenceMeter value={analysis.intentConfidence} label="Confidence" />
                  <p className="rounded-lg bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground/90">
                    {analysis.intentReasoning}
                  </p>
                </CardContent>
              </Card>

              {/* Sentiment */}
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
                    <ConfidenceMeter value={analysis.sentiment.intensity} label="Sentiment intensity" />
                    <p className="rounded-lg bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground/90">
                      {analysis.sentiment.reasoning}
                    </p>
                    {analysis.sentiment.escalationWeight >= 0.4 && (
                      <div className="flex items-center gap-1.5 rounded-md bg-warning/10 px-2.5 py-1.5 text-[11px] text-warning-foreground">
                        <AlertTriangle className="h-3 w-3" />
                        High-emotion sentiment contributed to the escalation decision.
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Decision */}
              <Card className={analysis.decision === "escalate" ? "border-warning/40" : "border-success/30"}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {analysis.decision === "escalate" ? (
                      <ShieldAlert className="h-4 w-4 text-warning" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-success" />
                    )}
                    Decision
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <DecisionBadge decision={analysis.decision} />
                  <p className="rounded-lg bg-muted/40 p-2.5 text-xs leading-relaxed text-foreground/90">
                    {analysis.decisionReason}
                  </p>
                  {analysis.escalationSignals.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.escalationSignals.map((s, i) => (
                        <RiskChip key={i}>{s}</RiskChip>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Judge */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Scale className="h-4 w-4 text-primary" />
                      LLM-as-Judge
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={handleJudge} disabled={judging} className="gap-1.5">
                      {judging ? <Loader2 className="h-3 w-3 animate-spin" /> : <Scale className="h-3 w-3" />}
                      {judging ? "Judging…" : judge ? "Re-judge" : "Judge reply"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!judge && !judging && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Run the judge to score this reply on groundedness, safety, tone & actionability.
                    </div>
                  )}
                  {judging && (
                    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Scoring…
                    </div>
                  )}
                  {judge && !judging && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: "Groundedness", v: judge.groundedness },
                          { label: "Safety", v: judge.safety },
                          { label: "Tone", v: judge.tone },
                          { label: "Actionability", v: judge.actionability },
                        ].map((d) => (
                          <div key={d.label} className="rounded-lg bg-muted/40 p-2">
                            <ConfidenceMeter value={d.v} label={d.label} />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                        <span className="text-xs font-medium text-foreground">Overall</span>
                        <div className="flex items-center gap-2">
                          <ConfidenceMeter value={judge.overall} />
                          <span className="text-sm font-bold text-foreground">
                            {Math.round(judge.overall * 100)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs italic text-muted-foreground">"{judge.critique}"</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Custom BERT sentiment comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Smile className="h-4 w-4 text-primary" />
                      Custom BERT Sentiment
                      <Badge variant="outline" className="text-[10px] gap-1 font-normal">
                        <Cpu className="h-2.5 w-2.5" />
                        bert-novel-v1
                      </Badge>
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={handleCustomSentiment} disabled={customLoading || !analysis} className="gap-1.5">
                      {customLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Smile className="h-3 w-3" />}
                      {customLoading ? "Scoring…" : customSentiment ? "Re-run" : "Run BERT model"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!customSentiment && !customLoading && (
                    <div className="flex items-center gap-2 rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Run the custom fine-tuned BERT model (4-class: positive/negative/neutral/irrelevant) and compare with the LLM sentiment above.
                    </div>
                  )}
                  {customLoading && (
                    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Calling jyqti-bert-novel.hf.space…
                    </div>
                  )}
                  {customSentiment && !customLoading && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="text-xs font-medium"
                          style={{
                            color:
                              customSentiment.label === "negative" ? "oklch(0.6 0.2 25)" :
                              customSentiment.label === "positive" ? "oklch(0.62 0.13 162)" :
                              "oklch(0.55 0.01 150)",
                            borderColor: "currentColor",
                          }}
                        >
                          {customSentiment.label}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {customSentiment.latencyMs}ms · esc weight {Math.round(customSentiment.escalationWeight * 100)}%
                        </span>
                      </div>
                      {/* Probability bars */}
                      <div className="space-y-1.5">
                        {(["negative", "neutral", "positive", "irrelevant"] as const).map((k) => {
                          const v = customSentiment.probs[k] ?? 0;
                          const pct = Math.round(v * 100);
                          const color =
                            k === "negative" ? "bg-destructive" :
                            k === "positive" ? "bg-success" :
                            k === "neutral" ? "bg-muted-foreground" :
                            "bg-warning";
                          return (
                            <div key={k} className="flex items-center gap-2">
                              <span className="w-16 text-[10px] capitalize text-muted-foreground">{k}</span>
                              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="w-10 text-right font-mono text-[10px] text-foreground">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                      {/* Comparison note */}
                      {analysis?.sentiment && (
                        <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                          <span className="font-medium text-foreground">Comparison:</span> LLM sentiment (aabir-sentiment-v1) said{" "}
                          <span className="font-medium text-foreground">{analysis.sentiment.label}</span> ({Math.round(analysis.sentiment.intensity * 100)}% intensity).
                          Custom BERT says{" "}
                          <span className="font-medium text-foreground">{customSentiment.label}</span> ({Math.round(customSentiment.score * 100)}% confidence).
                          {analysis.sentiment.label === "positive" && customSentiment.label === "negative" && (
                            <span className="mt-1 block text-warning-foreground">⚠ BERT may have a false-negative on positive messages containing words like "refund".</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
