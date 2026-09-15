"use client";

import { Menu, Moon, Sun, Github, Bell, Search, CheckCircle2, AlertTriangle, MessageCircleHeart, X } from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const VIEW_TITLES: Record<ViewId, { title: string; subtitle: string }> = {
  inbox: { title: "Agent Inbox", subtitle: "Customer messages awaiting the AI agent" },
  playground: { title: "Playground", subtitle: "Multi-turn conversations against the live agent" },
  analytics: { title: "Analytics", subtitle: "Intent, decision, latency & judge metrics" },
  evaluation: { title: "Evaluation Harness", subtitle: "Golden set, baselines & LLM-as-judge" },
  abtest: { title: "A/B Threshold Tuning", subtitle: "Confidence threshold vs. total operating cost" },
  feedback: { title: "Human-in-the-Loop", subtitle: "Customer & reviewer feedback signals" },
  settings: { title: "Settings", subtitle: "Configure repo, costs, threshold & brand" },
  report: { title: "Report", subtitle: "Findings & next steps" },
  decisions: { title: "Decision Log", subtitle: "Engineering calls & tradeoffs" },
};

interface Notification {
  id: string;
  icon: "escalate" | "feedback" | "auto";
  title: string;
  body: string;
  time: string;
  unread?: boolean;
}

const NOTIFICATIONS: Notification[] = [
  { id: "n1", icon: "escalate", title: "Escalation routed", body: "@nadiaf — possible account takeover routed to Account Protection.", time: "3m ago", unread: true },
  { id: "n2", icon: "feedback", title: "New feedback", body: "Customer downvoted an auto-handled refund reply. Logged as hard negative.", time: "12m ago", unread: true },
  { id: "n3", icon: "auto", title: "Auto-handle milestone", body: "12 of 24 queue messages auto-handled this hour (50%). Within target.", time: "28m ago", unread: true },
  { id: "n4", icon: "escalate", title: "Escalation routed", body: "@furious_frank — high-emotion complaint handed to a human lead.", time: "2h ago" },
  { id: "n5", icon: "feedback", title: "Feedback trend", body: "3 new downvotes this hour on refund replies — reviewing for hard negatives.", time: "3h ago" },
];

export function Header() {
  const { view, setSidebarOpen, theme, toggleTheme, settings } = useAppStore();
  const meta = VIEW_TITLES[view];
  const [notifOpen, setNotifOpen] = useState(false);
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;

  // Shift+N toggles the notification panel
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        setNotifOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Theme toggle via "T" key (no modifier) — listed in shortcut help
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "t" && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        toggleTheme();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleTheme]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 glass px-4 md:px-6">
      <button
        className="rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open sidebar"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="truncate text-lg font-bold tracking-tight text-foreground sm:text-xl">
          {meta.title}
        </h1>
        <p className="hidden truncate text-xs text-muted-foreground sm:block">{meta.subtitle}</p>
      </div>

      {/* Search — opens command palette */}
      <button
        onClick={() => {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
        }}
        className="relative hidden lg:flex w-56 h-9 items-center gap-2 rounded-md border border-transparent bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:bg-muted/60"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-border bg-card px-1 py-0.5 text-[9px] font-mono font-semibold">⌘K</kbd>
      </button>

      <Badge variant="outline" className="hidden md:inline-flex gap-1.5 border-success/30 bg-success/5 text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
        Live
      </Badge>

      {/* Notification panel */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative"
          aria-label="Notifications"
          onClick={() => setNotifOpen((v) => !v)}
        >
          <Bell className="h-[18px] w-[18px]" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
        <AnimatePresence>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18 }}
                className="absolute right-0 top-11 z-50 w-[340px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Notifications</span>
                    {unread > 0 && (
                      <Badge className="h-4 min-w-4 justify-center bg-destructive px-1 text-[9px] text-destructive-foreground">
                        {unread} new
                      </Badge>
                    )}
                  </div>
                  <button
                    onClick={() => setNotifOpen(false)}
                    className="rounded p-1 text-muted-foreground hover:bg-accent"
                    aria-label="Close notifications"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="max-h-[360px] overflow-y-auto">
                  {NOTIFICATIONS.map((n) => {
                    const Icon =
                      n.icon === "escalate" ? AlertTriangle :
                      n.icon === "feedback" ? MessageCircleHeart : CheckCircle2;
                    const color =
                      n.icon === "escalate" ? "text-warning" :
                      n.icon === "feedback" ? "text-primary" : "text-success";
                    return (
                      <div
                        key={n.id}
                        className="flex gap-2.5 border-b border-border/60 px-3.5 py-2.5 last:border-0 hover:bg-accent/40 transition-colors"
                      >
                        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-foreground">{n.title}</span>
                            {n.unread && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{n.body}</p>
                          <div className="mt-0.5 text-[10px] text-muted-foreground/70">{n.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-border bg-muted/30 px-3.5 py-2 text-center">
                  <button className="text-[11px] font-medium text-primary hover:underline">
                    Mark all as read
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "light" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
      </Button>

      <a
        href={settings.githubRepoUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="View source on GitHub"
      >
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Github className="h-[18px] w-[18px]" />
        </Button>
      </a>

      <div className="ml-1 flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-emerald-700 text-xs font-bold text-primary-foreground">
        AK
      </div>
    </header>
  );
}
