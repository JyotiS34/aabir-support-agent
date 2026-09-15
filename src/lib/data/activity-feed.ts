// Live activity feed events — simulates the stream of agent actions a support
// lead would see in production. In production this would be a websocket from
// the agent service; here it's a static, time-shifted list that re-timestamps
// on load so "time ago" stays fresh.

export type ActivityType =
  | "classified"
  | "drafted"
  | "auto-handled"
  | "escalated"
  | "sentiment"
  | "feedback"
  | "judge";

export interface ActivityEvent {
  id: string;
  type: ActivityType;
  customerHandle: string;
  intent: string;
  detail: string;
  decision?: "auto-handle" | "escalate";
  // seconds ago (relative to load)
  secondsAgo: number;
  latencyMs?: number;
}

const MIN = 60;
const HR = 60 * MIN;

export const ACTIVITY_TEMPLATES: Omit<ActivityEvent, "secondsAgo">[] = [
  { id: "a1", type: "escalated", customerHandle: "@nadiaf", intent: "account_access", detail: "Possible account takeover routed to Account Protection", decision: "escalate", latencyMs: 2380 },
  { id: "a2", type: "auto-handled", customerHandle: "@lily_chen", intent: "return_request", detail: "Return label generated · auto-sent", decision: "auto-handle", latencyMs: 1720 },
  { id: "a3", type: "classified", customerHandle: "@jenny_k", intent: "order_status", detail: "Intent: order_status (95% confidence)", latencyMs: 1820 },
  { id: "a4", type: "drafted", customerHandle: "@sarah_m", intent: "delivery_delay", detail: "Drafted grounded reply (3 steps cited)", latencyMs: 2110 },
  { id: "a5", type: "sentiment", customerHandle: "@furious_frank", intent: "general_complaint", detail: "Sentiment: angry (92%) → escalation signal", latencyMs: 320 },
  { id: "a6", type: "escalated", customerHandle: "@rgupta", intent: "payment_issue", detail: "Possible fraud · routed to payments team", decision: "escalate", latencyMs: 2240 },
  { id: "a7", type: "feedback", customerHandle: "@amandawrites", intent: "refund_request", detail: "Customer downvoted reply → flagged for review" },
  { id: "a8", type: "auto-handled", customerHandle: "@priya_n", intent: "cancel_order", detail: "Order cancelled pre-ship · auto-confirmed", decision: "auto-handle", latencyMs: 1790 },
  { id: "a9", type: "judge", customerHandle: "@mike_wood", intent: "product_question", detail: "LLM-judge scored reply 91% (acceptable)", latencyMs: 1660 },
  { id: "a10", type: "classified", customerHandle: "@dev_rao", intent: "app_website_bug", detail: "Intent: app_website_bug (90% confidence)", latencyMs: 1900 },
  { id: "a11", type: "escalated", customerHandle: "@furious_frank", intent: "general_complaint", detail: "High-emotion complaint → human lead", decision: "escalate", latencyMs: 2190 },
  { id: "a12", type: "auto-handled", customerHandle: "@bob_reilly", intent: "prime_membership", detail: "Prime cancelled · courtesy refund path", decision: "auto-handle", latencyMs: 1850 },
];

// Spread events across the last ~12 minutes with realistic spacing.
export function getActivityFeed(): ActivityEvent[] {
  const now = Date.now();
  return ACTIVITY_TEMPLATES.map((t, i) => ({
    ...t,
    // stagger: oldest ~12 min, newest ~30s
    secondsAgo: Math.round(30 + (i * (12 * HR - 30)) / (ACTIVITY_TEMPLATES.length - 1)),
  })).sort((a, b) => a.secondsAgo - b.secondsAgo);
}

// Pool of random customer handles + intents for generating live events.
const LIVE_HANDLES = ["@alex_t", "@bea_k", "@carlos_m", "@dee_w", "@ellie_p", "@frank_r", "@gita_s", "@harvey_l", "@ina_b", "@jules_d"];
const LIVE_INTENTS = ["order_status", "delivery_delay", "damaged_defective", "refund_request", "return_request", "cancel_order", "payment_issue", "account_access", "prime_membership", "app_website_bug", "product_question", "general_complaint"];

// Generate a single random new event (secondsAgo = 0, "just now").
export function generateLiveEvent(): ActivityEvent {
  const types: ActivityType[] = ["classified", "drafted", "auto-handled", "escalated", "sentiment", "judge"];
  const type = types[Math.floor(Math.random() * types.length)];
  const handle = LIVE_HANDLES[Math.floor(Math.random() * LIVE_HANDLES.length)];
  const intent = LIVE_INTENTS[Math.floor(Math.random() * LIVE_INTENTS.length)];
  const latencyMs = Math.round(1600 + Math.random() * 900);
  const id = `live-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const decision: "auto-handle" | "escalate" = Math.random() > 0.5 ? "auto-handle" : "escalate";

  const details: Record<ActivityType, string> = {
    classified: `Intent: ${intent} (${(80 + Math.random() * 18).toFixed(0)}% confidence)`,
    drafted: `Drafted grounded reply (${Math.floor(2 + Math.random() * 3)} steps cited)`,
    "auto-handled": `Auto-handled · ${intent.replace(/_/g, " ")}`,
    escalated: `Escalated · ${intent.replace(/_/g, " ")} → human review`,
    sentiment: `Sentiment: ${["neutral", "frustrated", "angry"][Math.floor(Math.random() * 3)]} (${(40 + Math.random() * 50).toFixed(0)}%) → signal`,
    feedback: "Customer upvoted a reply",
    judge: `LLM-judge scored reply ${(70 + Math.random() * 25).toFixed(0)}% (acceptable)`,
  };

  return {
    id,
    type,
    customerHandle: handle,
    intent,
    detail: details[type],
    decision: type === "auto-handled" || type === "escalated" ? decision : undefined,
    latencyMs,
    secondsAgo: 0,
  };
}

export function formatTimeAgo(secondsAgo: number): string {
  if (secondsAgo < MIN) return `${secondsAgo}s ago`;
  if (secondsAgo < HR) return `${Math.floor(secondsAgo / MIN)}m ago`;
  return `${Math.floor(secondsAgo / HR)}h ago`;
}

export const ACTIVITY_META: Record<ActivityType, { label: string; color: string; icon: string }> = {
  classified: { label: "Classified", color: "oklch(0.7 0.12 180)", icon: "tag" },
  drafted: { label: "Drafted", color: "oklch(0.62 0.13 162)", icon: "message" },
  "auto-handled": { label: "Auto-handled", color: "oklch(0.62 0.13 162)", icon: "check" },
  escalated: { label: "Escalated", color: "oklch(0.72 0.16 70)", icon: "alert" },
  sentiment: { label: "Sentiment", color: "oklch(0.68 0.17 45)", icon: "smile" },
  feedback: { label: "Feedback", color: "oklch(0.7 0.12 180)", icon: "heart" },
  judge: { label: "Judge", color: "oklch(0.55 0.01 150)", icon: "scale" },
};
