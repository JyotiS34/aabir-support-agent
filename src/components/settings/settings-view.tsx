"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import {
  Settings as SettingsIcon,
  Github,
  DollarSign,
  Gauge,
  RotateCcw,
  Save,
  ExternalLink,
  Store,
  Zap,
} from "lucide-react";

export function SettingsView() {
  const { settings, updateSettings, resetSettings } = useAppStore();
  const [draft, setDraft] = useState(settings);
  const [dirty, setDirty] = useState(false);

  // hydrate from localStorage on mount
  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    updateSettings(draft);
    setDirty(false);
    toast.success("Settings saved", { description: "Persisted to localStorage" });
  };

  const handleReset = () => {
    resetSettings();
    // re-read defaults from the store after reset
    const defaults = useAppStore.getState().settings;
    setDraft(defaults);
    setDirty(false);
    toast.success("Settings reset to defaults");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Header banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <SettingsIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Agent settings</span>
              {dirty && (
                <Badge className="gap-1 bg-warning/15 text-warning-foreground border border-warning/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  Unsaved changes
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Configure the GitHub repo, A/B cost weights, deployed confidence threshold, and brand identity.
              Changes persist to localStorage and apply across the app instantly on save.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!dirty} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* GitHub repo */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Github className="h-4 w-4 text-primary" />
              GitHub repository
            </CardTitle>
            <CardDescription className="text-xs">
              The repo URL opened by the GitHub button in the header & footer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div>
              <Label htmlFor="repo" className="text-[11px] text-muted-foreground">
                Repository URL
              </Label>
              <Input
                id="repo"
                value={draft.githubRepoUrl}
                onChange={(e) => set("githubRepoUrl", e.target.value)}
                placeholder="https://github.com/your-org/your-repo"
                className="mt-1 font-mono text-xs bg-card"
              />
            </div>
            <a
              href={draft.githubRepoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              Open in new tab
            </a>
          </CardContent>
        </Card>
      </motion.div>

      {/* Cost weights */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-primary" />
              A/B cost weights
            </CardTitle>
            <CardDescription className="text-xs">
              Unit costs per message used by the A/B Threshold view to compute total operating cost.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <CostSlider
              label="Wrong-auto cost"
              hint="per wrongly auto-handled sensitive message"
              value={draft.costWrongAuto}
              min={5}
              max={100}
              step={5}
              tone="destructive"
              onChange={(v) => set("costWrongAuto", v)}
            />
            <CostSlider
              label="Human-review cost"
              hint="per escalated message a human reviews"
              value={draft.costHumanReview}
              min={1}
              max={20}
              step={1}
              tone="warning"
              onChange={(v) => set("costHumanReview", v)}
            />
            <CostSlider
              label="Good-auto benefit"
              hint="savings per correctly auto-handled message (negative = benefit)"
              value={draft.costGoodAuto}
              min={-10}
              max={0}
              step={1}
              tone="success"
              onChange={(v) => set("costGoodAuto", v)}
            />
            {/* Live preview — break-even analysis that updates as sliders move */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                <Zap className="h-3 w-3" />
                Live preview (updates as you drag)
              </div>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Break-even: 1 wrong-auto cancels
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {Math.abs(draft.costWrongAuto / (draft.costGoodAuto || -1)).toFixed(1)} good-autos
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Wrong-auto vs human-review ratio
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {(draft.costWrongAuto / (draft.costHumanReview || 1)).toFixed(1)} : 1
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Saving 1 wrong-auto pays for
                  </span>
                  <span className="font-mono font-bold text-foreground">
                    {(draft.costWrongAuto / (draft.costHumanReview || 1)).toFixed(1)} human reviews
                  </span>
                </div>
              </div>
              {/* Relative-magnitude bar */}
              <div className="mt-3">
                <div className="mb-1 text-[10px] text-muted-foreground">Relative cost magnitude</div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-destructive transition-all duration-300"
                    style={{ width: `${(draft.costWrongAuto / (draft.costWrongAuto + draft.costHumanReview + Math.abs(draft.costGoodAuto))) * 100}%` }}
                  />
                  <div
                    className="h-full bg-warning transition-all duration-300"
                    style={{ width: `${(draft.costHumanReview / (draft.costWrongAuto + draft.costHumanReview + Math.abs(draft.costGoodAuto))) * 100}%` }}
                  />
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{ width: `${(Math.abs(draft.costGoodAuto) / (draft.costWrongAuto + draft.costHumanReview + Math.abs(draft.costGoodAuto))) * 100}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                  <span>Wrong-auto</span>
                  <span>Human-review</span>
                  <span>Good-auto benefit</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Deployed threshold */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-primary" />
              Deployed confidence threshold
            </CardTitle>
            <CardDescription className="text-xs">
              The confidence threshold currently in production. The A/B view recommends an optimal; set it here to deploy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-primary tabular-nums">
                {draft.deployedThreshold.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">threshold</span>
            </div>
            <Slider
              value={[draft.deployedThreshold]}
              onValueChange={(v) => set("deployedThreshold", v[0])}
              min={0.4}
              max={0.85}
              step={0.05}
              className="py-2"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0.40 (aggressive auto)</span>
              <span>0.85 (conservative)</span>
            </div>
            <div className="rounded-lg bg-muted/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Zap className="mr-1 inline h-3 w-3 text-primary" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Brand identity */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.15 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Store className="h-4 w-4 text-primary" />
              Brand identity
            </CardTitle>
            <CardDescription className="text-xs">
              The brand the agent represents. Shown in the sidebar brand card.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="brandName" className="text-[11px] text-muted-foreground">
                Brand name
              </Label>
              <Input
                id="brandName"
                value={draft.brandName}
                onChange={(e) => set("brandName", e.target.value)}
                className="mt-1 text-sm bg-card"
              />
            </div>
            <div>
              <Label htmlFor="brandHandle" className="text-[11px] text-muted-foreground">
                Brand handle
              </Label>
              <Input
                id="brandHandle"
                value={draft.brandHandle}
                onChange={(e) => set("brandHandle", e.target.value)}
                className="mt-1 text-sm font-mono bg-card"
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Save bar (sticky at bottom of the form) */}
      {dirty && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4 z-10 flex items-center justify-between rounded-xl border border-warning/40 bg-card/95 px-4 py-3 shadow-lg backdrop-blur"
        >
          <span className="text-xs text-foreground">You have unsaved changes</span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" />
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="h-3.5 w-3.5" />
              Save changes
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function CostSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  tone,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  tone: "destructive" | "warning" | "success";
  onChange: (v: number) => void;
}) {
  const toneClass =
    tone === "destructive" ? "text-destructive" : tone === "warning" ? "text-warning" : "text-success";
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <div>
          <span className="text-xs font-medium text-foreground">{label}</span>
          <span className="ml-2 text-[10px] text-muted-foreground">{hint}</span>
        </div>
        <span className={`text-lg font-bold tabular-nums ${toneClass}`}>
          {value < 0 ? "−" : ""}${Math.abs(value)}
        </span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} />
    </div>
  );
}
