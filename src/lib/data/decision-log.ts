export interface DecisionEntry {
  id: number;
  decision: string;
  rationale: string;
  tradeoff: string;
}

export const DECISION_LOG: DecisionEntry[] = [
  {
    id: 1,
    decision: "Picked @AmazonHelp as the single brand instead of multi-brand.",
    rationale: "Depth over breadth. A single brand lets the agent learn one consistent voice, one policy set, and one resolution-pattern library — making the 'grounded in historical replies' requirement actually measurable.",
    tradeoff: "We can't show cross-brand generalization, but the assignment scores proof-of-goodness, not coverage.",
  },
  {
    id: 2,
    decision: "Defined a fixed 12-intent taxonomy up front, rather than discovering intents via clustering.",
    rationale: "A closed label set makes intent accuracy computable and lets the classifier return a single argmax. Open-set clustering would make evaluation subjective and baseline comparison unfair.",
    tradeoff: "We may miss a long tail of rare intents; we bucket them into 'general_complaint' and flag low confidence.",
  },
  {
    id: 3,
    decision: "Multi-intent messages collapse to the HIGHEST-severity intent, not the most-likely one.",
    rationale: "Customers who mention a broken item AND a charge issue must get the damaged-item path (high severity) even if 'charge' is statistically more frequent. Severity drives escalation safety.",
    tradeoff: "We under-respond to secondary intents; the draft mentions both but the decision follows the primary.",
  },
  {
    id: 4,
    decision: "The agent drafts replies grounded in a hand-authored 'resolution pattern' library, not raw retrieved tweets.",
    rationale: "Real historical tweets are noisy, off-brand, and sometimes policy-violating. A curated pattern library per intent gives the LLM clean, on-policy grounding and makes 'groundedness' auditable.",
    tradeoff: "Authoring patterns is manual work; in production we'd retrieve + filter + dedupe real tweets, then synthesize patterns.",
  },
  {
    id: 5,
    decision: "Escalation is a hybrid: deterministic rule signals + LLM judgment, with rules as the fallback.",
    rationale: "Pure-LLM escalation is opaque and can drift. Pure-rule escalation is brittle. Combining them gives explainable signals (the 'reason') while letting the LLM weigh nuance. If the LLM call fails, rules guarantee a safe decision.",
    tradeoff: "Two systems to maintain; occasionally they disagree — we log both and prefer 'escalate' on conflict (fail-safe).",
  },
  {
    id: 6,
    decision: "Confidence threshold for escalation is 0.60, not 0.50 or 0.80.",
    rationale: "0.50 auto-escalates too much (cost); 0.80 escalates too little (risk). 0.60 was chosen by running the A/B threshold view: it minimizes total cost while keeping wrong-auto at 9 and correct-escalate at 4 out of 26 messages. The deployed threshold is tunable in Settings and the A/B view.",
    tradeoff: "It's a single global threshold; per-intent thresholds would likely improve precision.",
  },
  {
    id: 7,
    decision: "The LLM-as-judge rubric has 4 dimensions, not a single 'good/bad' score.",
    rationale: "A single score hides failure modes (e.g. safe-but-generic). Groundedness, safety, tone, actionability are independently measurable and map directly to brand requirements.",
    tradeoff: "More dimensions = more judge variance; we report inter-dimension agreement and overall.",
  },
  {
    id: 8,
    decision: "Judge agreement with humans is measured on accept/reject (binary), not on a continuous score.",
    rationale: "Continuous-score agreement requires heavy human calibration. Binary accept/reject is what actually matters operationally ('would we send this?') and yields a clean Cohen's κ.",
    tradeoff: "We lose granularity on 'almost acceptable' replies; we capture that in the critique field instead.",
  },
  {
    id: 9,
    decision: "Baselines are (a) trivial canned reply + no classification, and (b) keyword + nearest-example classifier + rule escalation.",
    rationale: "The trivial baseline sets the floor (any real system must beat 'DM us your order number'). The keyword baseline is the simplest 'real' system a team might ship in week one. Both make the LLM agent's lift legible.",
    tradeoff: "We didn't include a fine-tuned small model baseline (compute/time); noted in 'what I'd do next'.",
  },
  {
    id: 10,
    decision: "Golden set is 175 examples (120 Amazon + 55 Banking77), stratified across intent × difficulty × decision.",
    rationale: "Stratification prevents the eval from being dominated by easy order-status queries. Balancing auto/escalate ensures the decision metric isn't inflated by a majority class.",
    tradeoff: "Stratified ≠ natural distribution; headline accuracy overstates real-world performance on the dominant intents. Called out in the 'misleading headline' section.",
  },
  {
    id: 11,
    decision: "Replies are capped at 280 characters and never ask for PII publicly.",
    rationale: "Twitter constraint + safety. Enforced in the prompt and re-checked; violations count as safety=0 in the judge.",
    tradeoff: "280 chars sometimes forces terseness that reads as cold; we accept this for channel fidelity.",
  },
  {
    id: 12,
    decision: "Latency is reported per-call and averaged, not just p50.",
    rationale: "p50 hides tail latency that breaks real-time support UX. We report p50 and p95 in the eval view.",
    tradeoff: "Small sample sizes make p95 noisy; flagged as a caveat.",
  },
  {
    id: 13,
    decision: "The SaaS app caches analyses rather than calling the LLM on every page load.",
    rationale: "24 messages × 3 LLM calls = 72 calls per page load — slow and costly. Cached analyses render the Inbox/Analytics instantly; the Playground + Eval harness prove the live pipeline works.",
    tradeoff: "Cached results can drift from live model behavior; the 'Re-run' button in the Playground lets users verify freshness.",
  },
  {
    id: 14,
    decision: "Escalation reason is always a human-readable sentence, never just a code.",
    rationale: "The assignment explicitly asks for 'a stated reason'. A human-readable reason is also what a support lead needs to triage the queue.",
    tradeoff: "Slightly more tokens; worth it for explainability.",
  },
  {
    id: 15,
    decision: "Fail-safe direction: on any uncertainty, escalate.",
    rationale: "The cost of a wrong auto-reply (sending a refund to the wrong person, exposing data) far exceeds the cost of a human looking at an easy message. Every ambiguous path defaults to escalate.",
    tradeoff: "Higher escalation rate → lower auto-handle rate → higher cost. We report this honestly and tune the threshold against it.",
  },
];
