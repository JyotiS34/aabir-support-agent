"use client";

import { useEffect, useState } from "react";
import {
  Inbox,
  Sparkles,
  BarChart3,
  ClipboardCheck,
  FileText,
  ListChecks,
  Zap,
  X,
  MessageCircleHeart,
  FlaskConical,
  Settings as SettingsIcon,
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import { cn } from "@/lib/utils";

const NAV: { id: ViewId; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "inbox", label: "Agent Inbox", icon: Inbox, desc: "Live queue + analyses" },
  { id: "playground", label: "Playground", icon: Sparkles, desc: "Multi-turn + live agent" },
  { id: "analytics", label: "Analytics", icon: BarChart3, desc: "Intent, decisions, latency" },
  { id: "evaluation", label: "Evaluation", icon: ClipboardCheck, desc: "Golden set + judge" },
  { id: "abtest", label: "A/B Threshold", icon: FlaskConical, desc: "Confidence threshold tuning" },
  { id: "feedback", label: "Feedback Loop", icon: MessageCircleHeart, desc: "Human-in-the-loop signals" },
  { id: "report", label: "Report", icon: FileText, desc: "Findings + deployment" },
  { id: "decisions", label: "Decision Log", icon: ListChecks, desc: "Engineering calls" },
  { id: "settings", label: "Settings", icon: SettingsIcon, desc: "Configure the agent" },
];

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen, settings } = useAppStore();
  const [stats, setStats] = useState<{ queue: number; autoRate: number } | null>(null);

  // Fetch live queue stats once on mount
  useEffect(() => {
    let mounted = true;
    fetch("/api/messages")
      .then((r) => r.json())
      .then((d) => {
        if (mounted && d.ok && Array.isArray(d.messages)) {
          const total = d.messages.length;
          const auto = d.messages.filter(
            (m: { analysis?: { decision: string } }) => m.analysis?.decision === "auto-handle",
          ).length;
          setStats({ queue: total, autoRate: total ? Math.round((auto / total) * 100) : 0 });
        }
      })
      .catch(() => {
        /* server may be cold; keep null → shows dashes */
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 md:sticky md:top-0 md:h-screen md:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Brand */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-emerald-700 text-primary-foreground shadow-sm">
            <Zap className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <div className="text-xl font-bold tracking-tight text-sidebar-foreground">
              Aabir
            </div>
            <div className="text-[11px] text-muted-foreground">AI Support Agent</div>
          </div>
          <button
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Brand context card */}
        <div className="mx-4 mt-4 overflow-hidden rounded-xl border border-sidebar-border bg-sidebar-accent/30">
          <div className="flex items-center gap-2.5 p-3.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 text-sm font-bold text-white shadow-sm">
              {settings.brandName.slice(0, 1).toLowerCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-card-foreground truncate">{settings.brandName}</div>
              <div className="text-[11px] text-muted-foreground truncate">{settings.brandHandle}</div>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success border border-success/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Live
            </span>
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-sidebar-border bg-sidebar-border/50">
            <div className="bg-sidebar px-1 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Intents</div>
              <div className="text-sm font-bold text-foreground">12</div>
            </div>
            <div className="bg-sidebar px-1 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Queue</div>
              <div className="text-sm font-bold text-foreground tabular-nums">
                {stats ? stats.queue : "—"}
              </div>
            </div>
            <div className="bg-sidebar px-1 py-2 text-center">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Auto</div>
              <div className="text-sm font-bold text-success tabular-nums">
                {stats ? `${stats.autoRate}%` : "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Workspace
          </div>
          {NAV.map((item) => {
            const active = view === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-all",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "mt-0.5 h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                  )}
                  strokeWidth={2.2}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                    {item.desc}
                  </div>
                </div>
                {active && (
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer note */}
        <div className="border-t border-sidebar-border px-4 py-3">
          <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/30 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-[11px] font-medium text-foreground">Agent online</span>
            </div>
            <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-mono font-medium text-primary">
              openai/gpt-oss-120b
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
