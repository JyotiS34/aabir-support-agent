"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@/lib/store";
import { MessageList } from "./message-list";
import { AgentDetail } from "./agent-detail";
import { AgentAnalysisSkeleton } from "./agent-detail";
import type { AgentAnalysis } from "@/lib/agent";
import { Input } from "@/components/ui/input";
import { Search, Filter, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";

interface MessageItem {
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

export function InboxView() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [decisionFilter, setDecisionFilter] = useState<string>("all");
  const selectedTweetId = useAppStore((s) => s.selectedTweetId);
  const selectTweet = useAppStore((s) => s.selectTweet);

  useEffect(() => {
    let mounted = true;
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && d.ok) {
          setMessages(d.messages);
          if (d.messages.length && !selectedTweetId) {
            selectTweet(d.messages[0].tweetId);
          }
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      if (query) {
        const q = query.toLowerCase();
        if (
          !m.message.toLowerCase().includes(q) &&
          !m.customerHandle.toLowerCase().includes(q) &&
          !m.customerName.toLowerCase().includes(q)
        )
          return false;
      }
      if (intentFilter !== "all" && m.analysis?.intent !== intentFilter) return false;
      if (decisionFilter !== "all" && m.analysis?.decision !== decisionFilter) return false;
      return true;
    });
  }, [messages, query, intentFilter, decisionFilter]);

  const selected = messages.find((m) => m.tweetId === selectedTweetId) ?? null;

  // SLA summary across the filtered set
  // On track = < 2h, Due soon = 2-6h, Breached = > 6h
  const slaSummary = useMemo(() => {
    const now = Date.now();
    let ok = 0, soon = 0, late = 0;
    for (const m of filtered) {
      const mins = Math.floor((now - new Date(m.occurredAt).getTime()) / 60000);
      if (mins < 120) ok++;
      else if (mins < 360) soon++;
      else late++;
    }
    return { ok, soon, late, total: filtered.length };
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* SLA summary strip */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">In queue</div>
          <div className="text-lg font-bold text-foreground">{slaSummary.total}</div>
        </div>
        <div className="rounded-lg border border-success/20 bg-success/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">On track</div>
          <div className="text-lg font-bold text-success">{slaSummary.ok}</div>
        </div>
        <div className="rounded-lg border border-warning/25 bg-warning/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Due soon (2-6h)</div>
          <div className="text-lg font-bold text-warning-foreground">{slaSummary.soon}</div>
        </div>
        <div className="rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Breached (&gt;6h)</div>
          <div className="text-lg font-bold text-destructive">{slaSummary.late}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search messages, customers…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 bg-card"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={intentFilter} onValueChange={setIntentFilter}>
            <SelectTrigger className="w-[150px] bg-card">
              <Filter className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Intent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All intents</SelectItem>
              <SelectItem value="order_status">Order Status</SelectItem>
              <SelectItem value="delivery_delay">Delivery Delay</SelectItem>
              <SelectItem value="damaged_defective">Damaged / Defective</SelectItem>
              <SelectItem value="refund_request">Refund Request</SelectItem>
              <SelectItem value="return_request">Return Request</SelectItem>
              <SelectItem value="cancel_order">Cancel Order</SelectItem>
              <SelectItem value="payment_issue">Payment Issue</SelectItem>
              <SelectItem value="account_access">Account Access</SelectItem>
              <SelectItem value="prime_membership">Prime</SelectItem>
              <SelectItem value="app_website_bug">App / Bug</SelectItem>
              <SelectItem value="product_question">Product Question</SelectItem>
              <SelectItem value="general_complaint">Complaint</SelectItem>
            </SelectContent>
          </Select>
          <Select value={decisionFilter} onValueChange={setDecisionFilter}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Decision" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All decisions</SelectItem>
              <SelectItem value="auto-handle">Auto-handle</SelectItem>
              <SelectItem value="escalate">Escalate</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{filtered.length}</span>
          </Button>
        </div>
      </div>

      {/* Two-pane layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr]">
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MessageList
            messages={filtered}
            loading={loading}
            selectedId={selectedTweetId}
            onSelect={selectTweet}
          />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {selected ? <AgentDetail message={selected} /> : <AgentAnalysisSkeleton />}
        </motion.div>
      </div>
    </div>
  );
}
