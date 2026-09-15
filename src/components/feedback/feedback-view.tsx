"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircleHeart,
  TrendingUp,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { IntentBadge } from "@/components/agent-panel/badges";
import { motion } from "framer-motion";

interface FeedbackEntry {
  id: string;
  tweetId: string;
  customerHandle: string;
  message: string;
  intent: string;
  decision: "auto-handle" | "escalate";
  draftReply: string;
  vote: "up" | "down" | null;
  reviewer: "customer" | "agent-lead";
  note?: string;
  time: string;
  status: "logged" | "reviewing" | "folded-into-golden";
}

// Precomputed feedback log — simulates a week of human-in-the-loop signals.
const INITIAL_FEEDBACK: FeedbackEntry[] = [
  { id: "f1", tweetId: "t-1001", customerHandle: "@jenny_k", message: "Where is my order? Order #112-8847261", intent: "order_status", decision: "auto-handle", draftReply: "Hi Jenny! Sorry for the wait on tracking — DM us your order #…", vote: "up", reviewer: "customer", time: "2h ago", status: "logged" },
  { id: "f2", tweetId: "t-1005", customerHandle: "@ritika_s", message: "TV arrived with cracked screen", intent: "damaged_defective", decision: "escalate", draftReply: "Oh no, a cracked TV screen… DM your order # + photo…", vote: "up", reviewer: "agent-lead", note: "Good empathy + clear ask", time: "3h ago", status: "folded-into-golden" },
  { id: "f3", tweetId: "t-1007", customerHandle: "@amandawrites", message: "Returned 2 weeks ago, still no refund", intent: "refund_request", decision: "escalate", draftReply: "Amanda, waiting 2 weeks for a refund is on us…", vote: "down", reviewer: "customer", note: "Customer wanted a timeline, not just 'we'll look into it'", time: "5h ago", status: "reviewing" },
  { id: "f4", tweetId: "t-1009", customerHandle: "@lily_chen", message: "How do I return a shirt?", intent: "return_request", decision: "auto-handle", draftReply: "Hi Lily! Go to Your Orders → Return or Replace Items…", vote: "up", reviewer: "customer", time: "6h ago", status: "logged" },
  { id: "f5", tweetId: "t-1012", customerHandle: "@rgupta", message: "Unknown $79 charge, fraud concern", intent: "payment_issue", decision: "escalate", draftReply: "An unrecognized charge is worrying, Rahul…", vote: "up", reviewer: "agent-lead", note: "Correct fraud-aware routing", time: "8h ago", status: "folded-into-golden" },
  { id: "f6", tweetId: "t-1015", customerHandle: "@nadiaf", message: "Someone changed my account email, hacked", intent: "account_access", decision: "escalate", draftReply: "Nadia, a changed address you didn't make could mean takeover…", vote: "up", reviewer: "agent-lead", note: "Exemplary urgency", time: "9h ago", status: "folded-into-golden" },
  { id: "f7", tweetId: "t-1021", customerHandle: "@furious_frank", message: "WORST customer service ever", intent: "general_complaint", decision: "escalate", draftReply: "Frank, this isn't the bar we set… DM us what happened…", vote: "down", reviewer: "customer", note: "Felt too scripted; customer didn't engage", time: "11h ago", status: "reviewing" },
  { id: "f8", tweetId: "t-1003", customerHandle: "@sarah_m", message: "3rd delay on package", intent: "delivery_delay", decision: "auto-handle", draftReply: "Hi Sarah, 3 delays is genuinely frustrating… 48h or refund…", vote: "up", reviewer: "customer", time: "12h ago", status: "logged" },
  { id: "f9", tweetId: "t-1016", customerHandle: "@bob_reilly", message: "How do I cancel Prime?", intent: "prime_membership", decision: "auto-handle", draftReply: "Hi Bob! To cancel Prime go to amazon.com/membership…", vote: "up", reviewer: "customer", time: "14h ago", status: "logged" },
  { id: "f10", tweetId: "t-1008", customerHandle: "@kev_oh", message: "Charged twice, want refund", intent: "refund_request", decision: "escalate", draftReply: "A double charge is serious, Kevin… DM order # + last 4…", vote: "down", reviewer: "agent-lead", note: "Should have mentioned refund timeline explicitly", time: "16h ago", status: "folded-into-golden" },
  { id: "f11", tweetId: "t-1018", customerHandle: "@dev_rao", message: "App crashes opening cart", intent: "app_website_bug", decision: "auto-handle", draftReply: "Sorry the app's crashing on cart, Dev…", vote: "up", reviewer: "customer", time: "18h ago", status: "logged" },
  { id: "f12", tweetId: "t-1022", customerHandle: "@disappointed", message: "Third time this has happened", intent: "general_complaint", decision: "escalate", draftReply: "Maya, happening a third time is genuinely frustrating…", vote: "down", reviewer: "customer", note: "Customer felt the reply was generic", time: "20h ago", status: "reviewing" },
];

export function FeedbackView() {
  const [feedback, setFeedback] = useState<FeedbackEntry[]>(INITIAL_FEEDBACK);
  const [filter, setFilter] = useState<"all" | "up" | "down" | "reviewing">("all");

  const stats = useMemo(() => {
    const total = feedback.length;
    const up = feedback.filter((f) => f.vote === "up").length;
    const down = feedback.filter((f) => f.vote === "down").length;
    const reviewing = feedback.filter((f) => f.status === "reviewing").length;
    const folded = feedback.filter((f) => f.status === "folded-into-golden").length;
    const satisfaction = total ? Math.round((up / total) * 100) : 0;
    return { total, up, down, reviewing, folded, satisfaction };
  }, [feedback]);

  // Per-intent satisfaction
  const perIntent = useMemo(() => {
    const map: Record<string, { up: number; down: number }> = {};
    for (const f of feedback) {
      if (!map[f.intent]) map[f.intent] = { up: 0, down: 0 };
      if (f.vote === "up") map[f.intent].up++;
      else if (f.vote === "down") map[f.intent].down++;
    }
    return Object.entries(map).map(([intent, v]) => ({
      intent,
      up: v.up,
      down: v.down,
      total: v.up + v.down,
      satisfaction: v.up + v.down > 0 ? Math.round((v.up / (v.up + v.down)) * 100) : 0,
    })).sort((a, b) => b.down - a.down);
  }, [feedback]);

  const filtered = feedback.filter((f) => {
    if (filter === "all") return true;
    if (filter === "up") return f.vote === "up";
    if (filter === "down") return f.vote === "down";
    if (filter === "reviewing") return f.status === "reviewing";
    return true;
  });

  const handleVote = (id: string, vote: "up" | "down") => {
    setFeedback((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, vote, status: vote === "down" ? "reviewing" : f.status }
          : f
      )
    );
    toast.success(vote === "up" ? "Logged as positive feedback" : "Logged as negative feedback — flagged for review", {
      description: vote === "down" ? "Will be folded into the golden set as a hard negative." : undefined,
    });
  };

  const handleFoldIntoGolden = (id: string) => {
    setFeedback((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: "folded-into-golden" } : f))
    );
    toast.success("Folded into the golden set as a hard negative");
  };

  const pieData = [
    { name: "Positive", value: stats.up, color: "oklch(0.62 0.13 162)" },
    { name: "Negative", value: stats.down, color: "oklch(0.6 0.2 25)" },
  ];

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <MessageCircleHeart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              Human-in-the-loop feedback loop
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              Every auto-handled reply collects a thumbs-up/down from the customer or a reviewer.
              Downvotes are flagged for review, then folded back into the golden set as hard negatives —
              closing the loop between production traffic and the evaluation harness.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Total feedback</span>
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-[10px] text-muted-foreground">this week</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Satisfaction</span>
              <ThumbsUp className="h-4 w-4 text-success" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-success">{stats.satisfaction}%</div>
            <div className="text-[10px] text-muted-foreground">{stats.up} up · {stats.down} down</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">In review</span>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-warning">{stats.reviewing}</div>
            <div className="text-[10px] text-muted-foreground">awaiting agent-lead</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Folded to golden</span>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </div>
            <div className="mt-1.5 text-2xl font-bold text-primary">{stats.folded}</div>
            <div className="text-[10px] text-muted-foreground">hard negatives added</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Satisfaction donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <ThumbsUp className="h-4 w-4 text-primary" />
              Up vs down
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-1 space-y-1">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-mono font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Per-intent satisfaction */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              Satisfaction by intent
            </CardTitle>
            <CardDescription className="text-xs">
              Intents with the most downvotes surface as improvement targets.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={perIntent} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.005 150)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: "oklch(0.52 0.012 155)" }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="intent" tick={{ fontSize: 9, fill: "oklch(0.52 0.012 155)" }} width={100} />
                <Tooltip contentStyle={{ background: "oklch(1 0 0)", border: "1px solid oklch(0.9 0.005 150)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                <Bar dataKey="satisfaction" name="Satisfaction" radius={[0, 4, 4, 0]}>
                  {perIntent.map((d, i) => (
                    <Cell key={i} fill={d.satisfaction >= 75 ? "oklch(0.62 0.13 162)" : d.satisfaction >= 50 ? "oklch(0.72 0.16 70)" : "oklch(0.6 0.2 25)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {(["all", "up", "down", "reviewing"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="h-7 text-xs capitalize"
          >
            {f === "all" ? "All" : f === "up" ? "Positive" : f === "down" ? "Negative" : "In review"}
          </Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} entries</span>
      </div>

      {/* Feedback log */}
      <div className="space-y-2.5">
        {filtered.map((f, i) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: i * 0.02 }}
          >
            <Card className={f.vote === "down" ? "border-destructive/30" : f.vote === "up" ? "border-success/20" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[10px] font-bold text-white">
                    {f.customerHandle.slice(1, 3).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{f.customerHandle}</span>
                      <IntentBadge intentId={f.intent} size="sm" />
                      <Badge variant="outline" className="text-[9px] capitalize">{f.reviewer.replace("-", " ")}</Badge>
                      {f.status === "reviewing" && (
                        <Badge className="text-[9px] gap-0.5 bg-warning/15 text-warning-foreground border border-warning/30">
                          <AlertTriangle className="h-2 w-2" /> Reviewing
                        </Badge>
                      )}
                      {f.status === "folded-into-golden" && (
                        <Badge className="text-[9px] gap-0.5 bg-primary/15 text-primary border border-primary/30">
                          <CheckCircle2 className="h-2 w-2" /> Golden set
                        </Badge>
                      )}
                      <span className="ml-auto text-[10px] text-muted-foreground">{f.time}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-foreground/80 line-clamp-1">"{f.message}"</p>
                    <div className="mt-1.5 rounded-md bg-muted/40 px-2.5 py-1.5">
                      <p className="text-[11px] italic text-muted-foreground line-clamp-1">↳ {f.draftReply}</p>
                    </div>
                    {f.note && (
                      <p className="mt-1.5 text-[10px] text-muted-foreground">
                        <span className="font-medium">Note:</span> {f.note}
                      </p>
                    )}
                  </div>
                  {/* Vote controls */}
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      size="icon"
                      variant={f.vote === "up" ? "default" : "outline"}
                      className={`h-7 w-7 ${f.vote === "up" ? "bg-success text-success-foreground hover:bg-success" : ""}`}
                      onClick={() => handleVote(f.id, "up")}
                      aria-label="Thumbs up"
                    >
                      <ThumbsUp className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant={f.vote === "down" ? "default" : "outline"}
                      className={`h-7 w-7 ${f.vote === "down" ? "bg-destructive text-destructive-foreground hover:bg-destructive" : ""}`}
                      onClick={() => handleVote(f.id, "down")}
                      aria-label="Thumbs down"
                    >
                      <ThumbsDown className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                {f.vote === "down" && f.status !== "folded-into-golden" && (
                  <div className="mt-2.5 flex justify-end">
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => handleFoldIntoGolden(f.id)}>
                      <RotateCcw className="h-3 w-3" />
                      Fold into golden set
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
