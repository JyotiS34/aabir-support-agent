"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { CommandPalette } from "@/components/layout/command-palette";
import { ActivityTicker } from "@/components/layout/activity-ticker";
import { ShortcutHelp } from "@/components/layout/shortcut-help";
import { useAppStore, hydrateSettings } from "@/lib/store";
import { useEffect } from "react";
import { InboxView } from "@/components/inbox/inbox-view";
import { PlaygroundView } from "@/components/playground/playground-view";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { EvalView } from "@/components/eval/eval-view";
import { ABTestView } from "@/components/abtest/abtest-view";
import { FeedbackView } from "@/components/feedback/feedback-view";
import { SettingsView } from "@/components/settings/settings-view";
import { ReportView } from "@/components/report/report-view";
import { DecisionsView } from "@/components/report/decisions-view";

export default function Home() {
  const view = useAppStore((s) => s.view);

  // Hydrate settings from localStorage on first client render
  useEffect(() => {
    hydrateSettings();
  }, []);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background bg-grid">
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header />
          <main className="flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
              {view === "inbox" && <InboxView />}
              {view === "playground" && <PlaygroundView />}
              {view === "analytics" && <AnalyticsView />}
              {view === "evaluation" && <EvalView />}
              {view === "abtest" && <ABTestView />}
              {view === "feedback" && <FeedbackView />}
              {view === "settings" && <SettingsView />}
              {view === "report" && <ReportView />}
              {view === "decisions" && <DecisionsView />}
            </div>
          </main>
          <Footer />
        </div>
      </div>
      <CommandPalette />
      <ActivityTicker />
      <ShortcutHelp />
    </div>
  );
}
