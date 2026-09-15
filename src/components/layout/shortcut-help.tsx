"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Command as CommandIcon,
  ArrowUp,
  ArrowDown,
  CornerDownLeft,
  Activity,
  Bell,
  Sun,
  Moon,
  Keyboard,
  Search,
  Download,
} from "lucide-react";

// "Esc" isn't a lucide icon — render it as a kbd in the array via a sentinel.
const EscIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} {...props}>
    <path d="M19 8H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12h6" strokeLinecap="round" />
  </svg>
);

interface Shortcut {
  keys: { key: string; mod?: "cmd" | "shift" | "alt" }[];
  desc: string;
  icon: React.ElementType;
}

const GROUPS: { group: string; shortcuts: Shortcut[] }[] = [
  {
    group: "Global",
    shortcuts: [
      { keys: [{ key: "K", mod: "cmd" }], desc: "Open command palette", icon: CommandIcon },
      { keys: [{ key: "?" }], desc: "Show this shortcut help", icon: Keyboard },
      { keys: [{ key: "A", mod: "shift" }], desc: "Toggle live activity feed", icon: Activity },
      { keys: [{ key: "N", mod: "shift" }], desc: "Toggle notifications", icon: Bell },
      { keys: [{ key: "T" }], desc: "Toggle light/dark theme", icon: Sun },
    ],
  },
  {
    group: "Command palette",
    shortcuts: [
      { keys: [{ key: "↑" }, { key: "↓" }], desc: "Move selection", icon: ArrowUp },
      { keys: [{ key: "↵" }], desc: "Run selected action", icon: CornerDownLeft },
      { keys: [{ key: "Esc" }], desc: "Close palette / dialog", icon: EscIcon },
    ],
  },
  {
    group: "Playground",
    shortcuts: [
      { keys: [{ key: "/" }], desc: "Focus the message input", icon: Search },
      { keys: [{ key: "↵" }], desc: "Send message (Shift+↵ for newline)", icon: CornerDownLeft },
      { keys: [{ key: "E", mod: "cmd" }], desc: "Export conversation as JSON", icon: Download },
    ],
  },
];

function KeyCap({ keys }: { keys: Shortcut["keys"] }) {
  return (
    <span className="flex items-center gap-0.5">
      {keys.map((k, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-[10px] text-muted-foreground">+</span>}
          {k.mod === "cmd" && (
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-card px-1 text-[10px] font-mono font-semibold text-foreground shadow-sm">
              ⌘
            </kbd>
          )}
          {k.mod === "shift" && (
            <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-card px-1 text-[10px] font-mono font-semibold text-foreground shadow-sm">
              ⇧
            </kbd>
          )}
          <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-card px-1.5 text-[10px] font-mono font-semibold text-foreground shadow-sm">
            {k.key}
          </kbd>
        </span>
      ))}
    </span>
  );
}

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // "?" with shift, or "?" alone (shift is needed to type ? on most layouts)
      if (e.key === "?" || (e.shiftKey && e.key.toLowerCase() === "/")) {
        const tag = (document.activeElement?.tagName ?? "").toLowerCase();
        if (tag === "input" || tag === "textarea") return;
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Keyboard className="h-4 w-4 text-primary" />
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription className="text-xs">
            Press <kbd className="rounded border border-border bg-muted px-1 font-mono text-[10px]">?</kbd> anytime to toggle this help.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {GROUPS.map((g) => (
            <div key={g.group}>
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.group}
              </div>
              <div className="space-y-1.5">
                {g.shortcuts.map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40 transition-colors">
                      <div className="flex items-center gap-2 text-xs text-foreground">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.desc}
                      </div>
                      <KeyCap keys={s.keys} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-md bg-muted/40 px-3 py-2 text-[10px] text-muted-foreground">
          <Moon className="h-3 w-3" /> Shortcuts are ignored while typing in inputs.
        </div>
      </DialogContent>
    </Dialog>
  );
}
