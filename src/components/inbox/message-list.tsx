"use client";

import { IntentBadge, DecisionBadge, SeverityDot } from "@/components/agent-panel/badges";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, AlertCircle, Clock } from "lucide-react";

interface MessageItem {
  tweetId: string;
  customerHandle: string;
  customerName: string;
  message: string;
  occurredAt: string;
  difficulty: "easy" | "medium" | "hard";
  analysis?: {
    intent: string;
    intentConfidence: number;
    decision: "auto-handle" | "escalate";
  };
}

// Compute a synthetic SLA status from the message age.
// < 2h = on-track (green), 2-6h = due-soon (amber), > 6h = breached (red).
function getSlaStatus(occurredAt: string): { label: string; tone: "ok" | "soon" | "late"; minutes: number } {
  const minutes = Math.floor((Date.now() - new Date(occurredAt).getTime()) / 60000);
  if (minutes < 120) return { label: minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`, tone: "ok", minutes };
  if (minutes < 360) return { label: `${Math.floor(minutes / 60)}h ${minutes % 60}m`, tone: "soon", minutes };
  return { label: `${Math.floor(minutes / 60)}h`, tone: "late", minutes };
}

const SLA_TONE: Record<string, string> = {
  ok: "bg-success/10 text-success border-success/20",
  soon: "bg-warning/10 text-warning-foreground border-warning/30",
  late: "bg-destructive/10 text-destructive border-destructive/25",
};

export function MessageList({
  messages,
  loading,
  selectedId,
  onSelect,
}: {
  messages: MessageItem[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (loading) {
    return (
      <Card className="p-3">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (messages.length === 0) {
    return (
      <Card className="flex h-64 flex-col items-center justify-center gap-2 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <div className="text-sm font-medium text-foreground">No messages match</div>
        <div className="text-xs text-muted-foreground">Try clearing filters or search.</div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <MessageSquare className="h-3.5 w-3.5 text-primary" />
          Queue
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
            {messages.length}
          </span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          SLA tracked
        </div>
      </div>
      {/* Taller scroll area so the last item isn't clipped */}
      <ScrollArea className="h-[calc(100vh-16rem)] min-h-[420px] max-h-[760px]">
        <div className="divide-y divide-border">
          {messages.map((m) => {
            const active = m.tweetId === selectedId;
            const sla = getSlaStatus(m.occurredAt);
            return (
              <button
                key={m.tweetId}
                onClick={() => onSelect(m.tweetId)}
                className={cn(
                  "group relative flex w-full flex-col gap-1.5 px-3.5 py-3 text-left transition-all",
                  active
                    ? "bg-accent/70"
                    : "hover:bg-muted/40",
                )}
              >
                {/* Active accent bar */}
                {active && (
                  <span className="absolute left-0 top-0 h-full w-1 bg-primary" />
                )}
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white shadow-sm">
                    {m.customerName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-foreground">
                        {m.customerHandle}
                      </span>
                      <SeverityDot severity={m.difficulty === "hard" ? "high" : m.difficulty === "medium" ? "medium" : "low"} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span>{formatDistanceToNow(new Date(m.occurredAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {/* SLA badge */}
                  <span
                    className={cn(
                      "shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-bold font-mono",
                      SLA_TONE[sla.tone],
                    )}
                    title={`Waiting ${sla.label}`}
                  >
                    {sla.label}
                  </span>
                  {m.analysis && (
                    <DecisionBadge decision={m.analysis.decision} />
                  )}
                </div>
                <p className="line-clamp-2 text-xs leading-snug text-foreground/80">{m.message}</p>
                {m.analysis && (
                  <div className="flex items-center gap-1.5">
                    <IntentBadge intentId={m.analysis.intent} size="sm" />
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(m.analysis.intentConfidence * 100)}% conf
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
