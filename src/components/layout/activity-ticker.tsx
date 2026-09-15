"use client";

import { useEffect, useState } from "react";
import { Activity, X, Zap, Tag, MessageSquareText, ShieldCheck, ShieldAlert, Smile, Heart, Scale, CheckCircle2 } from "lucide-react";
import { getActivityFeed, formatTimeAgo, ACTIVITY_META, generateLiveEvent, type ActivityEvent } from "@/lib/data/activity-feed";
import { motion, AnimatePresence } from "framer-motion";

const ICONS: Record<string, React.ElementType> = {
  tag: Tag,
  message: MessageSquareText,
  check: ShieldCheck,
  alert: ShieldAlert,
  smile: Smile,
  heart: Heart,
  scale: Scale,
};

export function ActivityTicker() {
  const [open, setOpen] = useState(false);
  const [feed, setFeed] = useState<ActivityEvent[]>(() => getActivityFeed());
  const [tick, setTick] = useState(0);

  // Re-render every 5s so "time ago" stays fresh
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(i);
  }, []);

  // Stream new live events: prepend a new event every ~8s, age existing ones, cap at 30.
  // This simulates the websocket/long-poll we'd use in production.
  const [newEventPulse, setNewEventPulse] = useState(false);
  useEffect(() => {
    const i = setInterval(() => {
      const ev = generateLiveEvent();
      setFeed((prev) => {
        // age all existing events by 8s
        const aged = prev.map((e) => ({ ...e, secondsAgo: e.secondsAgo + 8 }));
        // prepend the new one, cap at 30
        return [ev, ...aged].slice(0, 30);
      });
      // pulse the button
      setNewEventPulse(true);
      setTimeout(() => setNewEventPulse(false), 1500);
    }, 8000);
    return () => clearInterval(i);
  }, []);

  // Keyboard shortcut: Shift+A
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key.toLowerCase() === "a" && !e.metaKey && !e.ctrlKey) {
        // avoid hijacking when typing in an input
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const liveCount = feed.filter((f) => f.secondsAgo < 120).length;

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={`fixed bottom-5 left-5 z-30 flex items-center gap-2 rounded-full border bg-card pl-2.5 pr-3 py-2 text-xs font-medium shadow-lg transition-all hover:border-primary/40 ${newEventPulse ? "border-primary/60 ring-2 ring-primary/20" : "border-border"}`}
        aria-label="Open live activity feed"
      >
        <span className="relative flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
          <Activity className={`h-3 w-3 text-primary transition-transform ${newEventPulse ? "scale-125" : ""}`} />
          {liveCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
          )}
        </span>
        <span className="hidden sm:inline text-foreground">Activity</span>
        {newEventPulse && (
          <span className="hidden sm:inline rounded bg-primary/15 px-1 py-0.5 text-[9px] font-medium text-primary">
            new
          </span>
        )}
        <kbd className="hidden sm:inline-flex rounded border border-border bg-muted px-1 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground">
          ⇧A
        </kbd>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="fixed bottom-16 left-5 z-50 w-[360px] max-w-[90vw] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  <span className="text-sm font-semibold text-foreground">Live activity</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                    {feed.length}
                  </span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  aria-label="Close activity feed"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              {/* Feed */}
              <div className="max-h-[400px] overflow-y-auto">
                {feed.length === 0 && (
                  <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                    No recent activity
                  </div>
                )}
                <div className="divide-y divide-border/60">
                  {feed.map((ev, i) => {
                    const meta = ACTIVITY_META[ev.type];
                    const Icon = ICONS[meta.icon] ?? Zap;
                    return (
                      <motion.div
                        key={ev.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25, delay: i * 0.03 }}
                        className="flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-accent/40 transition-colors"
                      >
                        <div
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ background: `${meta.color}15`, color: meta.color }}
                        >
                          <Icon className="h-3 w-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-foreground">
                              {ev.customerHandle}
                            </span>
                            <span
                              className="text-[9px] font-medium uppercase tracking-wider"
                              style={{ color: meta.color }}
                            >
                              {meta.label}
                            </span>
                            {ev.latencyMs && (
                              <span className="ml-auto font-mono text-[9px] text-muted-foreground">
                                {ev.latencyMs}ms
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-foreground/80">
                            {ev.detail}
                          </p>
                          <div className="mt-0.5 text-[10px] text-muted-foreground/70">
                            {formatTimeAgo(ev.secondsAgo)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              {/* Footer */}
              <div className="border-t border-border bg-muted/30 px-3.5 py-2 text-center">
                <button
                  onClick={() => {
                    setFeed(getActivityFeed());
                    setTick((t) => t + 1);
                  }}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Refresh feed
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* tick used to force re-render for time-ago */}
      <span className="sr-only">{tick}</span>
    </>
  );
}
