"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Sparkles,
  BarChart3,
  ClipboardCheck,
  FileText,
  ListChecks,
  FlaskConical,
  MessageCircleHeart,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Github,
  CornerDownLeft,
  Search,
  Command as CommandIcon,
  Keyboard,
} from "lucide-react";
import { useAppStore, type ViewId } from "@/lib/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Action {
  id: string;
  label: string;
  hint?: string;
  icon: React.ElementType;
  group: "Navigate" | "Actions" | "External";
  keywords: string[];
  run: () => void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const { setView, theme, toggleTheme } = useAppStore();

  // Global Cmd/Ctrl+K to open. Resets query/active when opening.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            setQuery("");
            setActive(0);
          }
          return !v;
        });
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const nav: { id: ViewId; label: string; icon: React.ElementType; keywords: string[] }[] = [
      { id: "inbox", label: "Agent Inbox", icon: Inbox, keywords: ["messages", "queue", "support"] },
      { id: "playground", label: "Playground", icon: Sparkles, keywords: ["try", "test", "live"] },
      { id: "analytics", label: "Analytics", icon: BarChart3, keywords: ["charts", "metrics", "stats"] },
      { id: "evaluation", label: "Evaluation Harness", icon: ClipboardCheck, keywords: ["eval", "golden", "judge"] },
      { id: "abtest", label: "A/B Threshold Tuning", icon: FlaskConical, keywords: ["threshold", "cost", "ab"] },
      { id: "feedback", label: "Feedback Loop", icon: MessageCircleHeart, keywords: ["human", "thumbs", "loop"] },
      { id: "report", label: "Report", icon: FileText, keywords: ["findings", "deployment"] },
      { id: "decisions", label: "Decision Log", icon: ListChecks, keywords: ["decisions", "engineering"] },
      { id: "settings", label: "Settings", icon: SettingsIcon, keywords: ["config", "repo", "cost", "threshold"] },
    ];
    return [
      ...nav.map((n) => ({
        ...n,
        hint: "Go to view",
        group: "Navigate" as const,
        run: () => {
          setView(n.id);
          setOpen(false);
        },
      })),
      {
        id: "toggle-theme",
        label: `Switch to ${theme === "light" ? "dark" : "light"} mode`,
        icon: theme === "light" ? Moon : Sun,
        group: "Actions" as const,
        hint: "Theme",
        keywords: ["dark", "light", "theme", "mode"],
        run: () => {
          toggleTheme();
          setOpen(false);
        },
      },
      {
        id: "show-shortcuts",
        label: "Show keyboard shortcuts",
        icon: Keyboard,
        group: "Actions" as const,
        hint: "Opens help",
        keywords: ["shortcuts", "help", "keys", "cheatsheet", "?"],
        run: () => {
          // Dispatch the "?" shortcut to open the ShortcutHelp overlay
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "?", shiftKey: true, bubbles: true }));
          setOpen(false);
        },
      },
      {
        id: "open-github",
        label: "Open GitHub repository",
        icon: Github,
        group: "External" as const,
        hint: "Opens new tab",
        keywords: ["repo", "source", "code", "github"],
        run: () => {
          window.open(useAppStore.getState().settings.githubRepoUrl, "_blank", "noopener,noreferrer");
          setOpen(false);
        },
      },
    ];
  }, [setView, theme, toggleTheme]);

  const filtered = useMemo(() => {
    if (!query.trim()) return actions;
    const q = query.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.includes(q)),
    );
  }, [actions, query]);

  const grouped = useMemo(() => {
    const g: Record<string, Action[]> = { Navigate: [], Actions: [], External: [] };
    filtered.forEach((a) => g[a.group].push(a));
    return g;
  }, [filtered]);

  // Keyboard nav within results
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = filtered[active];
        if (item) item.run();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, active]);

  // Flatten for index tracking
  const flat: { action: Action; groupIndex: number }[] = [];
  Object.entries(grouped).forEach(([group, items]) => {
    items.forEach((a) => flat.push({ action: a, groupIndex: flat.length }));
  });

  return (
    <>
      {/* Floating trigger button (bottom-right) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg transition-all hover:border-primary/40 hover:text-foreground"
        aria-label="Open command palette"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Quick actions</span>
        <kbd className="flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-semibold">
          <CommandIcon className="h-2.5 w-2.5" />K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Command palette</DialogTitle>
          </DialogHeader>
          {/* Search input */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              placeholder="Search views, actions…"
              className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-mono font-semibold text-muted-foreground">
              ESC
            </kbd>
          </div>
          {/* Results */}
          <div className="max-h-[360px] overflow-y-auto py-2">
            {flat.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No matches for "{query}"
              </div>
            )}
            {Object.entries(grouped).map(([group, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-1">
                  <div className="px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                  {items.map((a) => {
                    const idx = flat.findIndex((f) => f.action.id === a.id);
                    const isActive = idx === active;
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.id}
                        onMouseEnter={() => setActive(idx)}
                        onClick={a.run}
                        className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                          isActive ? "bg-accent" : "hover:bg-accent/50"
                        }`}
                      >
                        <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{a.label}</div>
                        </div>
                        {a.hint && (
                          <Badge variant="outline" className="text-[9px] font-normal text-muted-foreground">
                            {a.hint}
                          </Badge>
                        )}
                        {isActive && (
                          <CornerDownLeft className="h-3 w-3 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">↑↓</kbd> navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-card px-1 py-0.5 font-mono">↵</kbd> select
              </span>
            </div>
            <span className="font-mono">Aabir</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
