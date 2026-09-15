"use client";

import { Zap, Github } from "lucide-react";
import { useAppStore } from "@/lib/store";

export function Footer() {
  const view = useAppStore((s) => s.view);
  const repoUrl = useAppStore((s) => s.settings.githubRepoUrl);
  return (
    <footer className="mt-auto border-t border-border bg-card/50 px-4 py-4 md:px-6">
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <span className="font-medium text-foreground">Aabir</span>
          <span className="text-muted-foreground/60">·</span>
          <span>AI Support Agent for @AmazonHelp</span>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 transition-colors hover:text-foreground"
          >
            <Github className="h-3 w-3" />
            GitHub
          </a>
          <span className="text-muted-foreground/60">·</span>
          <span className="flex items-center gap-1">
            Current view: <span className="font-medium text-foreground capitalize">{view}</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
