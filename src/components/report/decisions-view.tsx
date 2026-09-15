"use client";

import { DECISION_LOG } from "@/lib/data/decision-log";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, ArrowLeftRight } from "lucide-react";

export function DecisionsView() {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Decision Log</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                The {DECISION_LOG.length} non-obvious engineering decisions, with rationale and tradeoffs.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {DECISION_LOG.map((d) => (
          <Card key={d.id} className="transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-sm font-bold text-primary">
                  {d.id}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{d.decision}</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 bg-success/5 text-success border-success/25 text-[10px]">
                        Why
                      </Badge>
                      <p className="text-xs leading-relaxed text-foreground/80">{d.rationale}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 bg-warning/5 text-warning-foreground border-warning/30 text-[10px]">
                        <ArrowLeftRight className="mr-1 h-2.5 w-2.5" />
                        Tradeoff
                      </Badge>
                      <p className="text-xs leading-relaxed text-muted-foreground">{d.tradeoff}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
