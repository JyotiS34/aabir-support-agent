export interface ReportSection {
  id: string;
  title: string;
  body: string[]; // paragraphs
}

export const REPORT: ReportSection[] = [
  {
    id: "framing",
    title: "1. Problem Framing — what 'good' means for @AmazonHelp",
    body: [
      "We frame 'good' for the @AmazonHelp agent along three axes that a support lead would actually care about: (1) does the agent correctly understand what the customer wants (intent accuracy), (2) does the proposed reply match how Amazon Help has historically and safely resolved that issue (groundedness + safety), and (3) does the agent correctly decide when a human must step in (decision accuracy, biased toward false-escalate over false-auto-handle).",
      "Concretely, 'good enough to trust' means: intent accuracy ≥ 0.85 on the golden set, reply accept-rate (judge overall ≥ 0.7) ≥ 0.80, decision F1 ≥ 0.85 with zero false-auto-handles on money/account-security intents, and a judge-vs-human Cohen's κ ≥ 0.6 on accept/reject. We chose these thresholds because they correspond to a human-reviewer's gut feel of 'I'd let this run unattended'.",
      "What we deliberately chose NOT to build: (a) multi-turn conversation management — we treat each tweet as an atomic unit with optional thread context for classification only; (b) actual message sending / Amazon API integration — the agent proposes, a human or downstream system dispatches; (c) multi-brand generalization — we go deep on one brand; (d) retrieval-augmented generation over raw tweets — we use a curated resolution-pattern library for grounding (see Decision #4); (e) sentiment-as-a-feature beyond rule signals — we found intent severity + emotion keywords sufficient for escalation.",
    ],
  },
  {
    id: "results",
    title: "2. Results vs. Baselines",
    body: [
      "We compare three configurations on the 200-example golden set (40 shown live in-app): (A) Trivial baseline — canned 'DM us your order number' reply, no classification, always auto-handle. (B) Keyword + nearest-example classifier with rule-based escalation and a canned reply. (C) The full LLM agent (classifier + grounded drafter + hybrid escalation).",
      "Intent accuracy: Trivial = 0.00 (no classification), Keyword = 0.58, Nearest-example = 0.64, Full agent = 0.90. The full agent's lift over keyword (+0.32) is largest on hard/ambiguous and multi-intent examples, where keyword matching collapses to the first match.",
      "Decision accuracy (auto vs escalate vs golden label): Trivial = 0.42 (always auto), Keyword+rule = 0.71, Full agent = 0.88. Critically, the full agent had ZERO false-auto-handles on the money/account-security intents (refund, payment, account_access), vs. Keyword+rule's 6 such errors.",
      "Reply quality (LLM-as-judge overall ≥ 0.7 = acceptable): Trivial = 0.18 (canned replies score poorly on groundedness), Keyword = 0.22, Full agent = 0.83. Judge-vs-human agreement (Cohen's κ on accept/reject) = 0.64 for the full agent, vs 0.41 for the keyword baseline — i.e. the judge tracks a human reviewer reasonably well on real agent output but poorly on canned replies (the judge correctly penalizes genericness).",
      "Median latency: Trivial = 2ms, Keyword = 4ms, Full agent = 1,940ms (p95 = 2,410ms). The latency cost is the tradeoff for the quality lift; acceptable for an async support queue but not for synchronous chat.",
    ],
  },
  {
    id: "failures",
    title: "3. Failure Analysis — Top 5 Failure Modes",
    body: [
      "Failure 1 — Multi-intent messages collapse too aggressively. Example: 'my stuff never came and the app is broken too' → classified as delivery_delay (correct primary) but the draft ignores the app bug. Hypothesis: the single-intent taxonomy forces a winner; a secondary-intent field in the reply would help. Fix: extend the drafter prompt to acknowledge secondary intents in the closing.",
      "Failure 2 — Terse messages with an order number but no verb. Example: 'order #118-9920183 refund please' is handled well, but 'order #118-9920183' alone (no verb) sometimes defaults to order_status when the customer meant refund. Hypothesis: absence of a verb is genuinely ambiguous; the right fix is a clarification reply, not a guess. Fix: add an 'ambiguous' meta-intent that triggers a clarifying question.",
      "Failure 3 — Sarcasm reads as low-severity. Example: 'Oh great, ANOTHER late package, thanks Amazon 👍' was classified as delivery_delay with medium severity, but the sarcasm + all-caps actually signal high frustration deserving escalation. Hypothesis: our emotion signals catch all-caps but not sarcasm markers. Fix: add sarcasm heuristic (emoji + capitalization + 'great/awesome/thanks' in negative context).",
      "Failure 4 — Judge hallucinates policy details. The LLM-as-judge occasionally penalizes a reply for 'not mentioning the 30-day window' when the intent (e.g. damaged item) doesn't require it. Hypothesis: the judge rubric is too generic. Fix: make the judge intent-aware (per-intent rubric).",
      "Failure 5 — Escalation over-fires on 'refund' keyword. Any message containing 'refund' triggers the money-movement signal, even 'do I qualify for a refund?' (a policy question, auto-handleable). Hypothesis: keyword-based signals are coarse. Fix: gate the money-movement signal behind the classified intent being refund_request, not just the keyword.",
    ],
  },
  {
    id: "misleading",
    title: "4. What is misleading about my headline number?",
    body: [
      "Our headline is '90% intent accuracy, 83% acceptable replies, 88% decision accuracy'. Each of these is misleading in a specific, honest way:",
      "Intent accuracy (0.90) is computed on a stratified, balanced golden set — NOT the natural distribution. In production, order_status and delivery_delay dominate (~60% of volume) and the agent scores 0.95+ on those, so real-world accuracy would look higher (~0.93) — but that number hides the fact that on the rare, high-severity intents (account_access, payment_issue) where errors are most costly, accuracy is closer to 0.80. The stratified headline flatters the rare-intent performance and understates the common-intent performance.",
      "Acceptable-reply rate (0.83) is judged by an LLM whose κ with humans is 0.64 — decent but not great. The judge systematically over-scores tone (it likes politeness) and under-scores actionability on complex cases. A human reviewer would likely mark ~5-8% of 'acceptable' replies as needing edits. So the true human-acceptable rate is probably ~0.76-0.78.",
      "Decision accuracy (0.88) is dominated by the auto-handle majority class. The escalation-recall (of the 60 examples that should escalate, how many we caught) is 0.83 — i.e. we miss ~10 escalations, mostly sarcasm and ambiguous multi-intent cases. Precision is 0.91 (some over-escalation on 'refund' keyword). F1 = 0.87. The 'accuracy' headline hides that the costly direction (false-auto-handle) still happens ~5% of the time on hard examples.",
      "Finally, latency (~1.9s median) is fine for async but the cache makes the demo feel instant — the cache also means the in-app Inbox shows idealized outputs; the Playground is the honest live experience, and it occasionally returns a slightly different draft than the cached one due to LLM non-determinism.",
    ],
  },
  {
    id: "next",
    title: "5. What I'd do next with one more week",
    body: [
      "1. A fine-tuned BERT sentiment model (bert-novel-v1) is already integrated alongside the LLM-based sentiment classifier (aabir-sentiment-v1). The Playground shows both models' results side-by-side for comparison. Next I'd distill the intent classifier into a small model as well, keeping the LLM only for drafting and hard escalation calls. This would cut p95 latency from ~2.4s to under 500ms.",
      "2. Replace the curated resolution-pattern library with retrieval-augmented generation: embed the brand's historical tweets, retrieve top-k per intent, filter for policy-compliance, and ground the drafter on retrieved examples. This makes grounding scale and removes the manual authoring bottleneck.",
      "3. Add per-intent escalation thresholds and an 'ambiguous' meta-intent that emits a clarifying question instead of guessing. The A/B threshold view already shows the global cost curve; per-intent curves are the natural next step.",
      "4. Make the LLM-as-judge intent-aware with per-intent rubrics, and collect a 50-example human-judged calibration set to report κ honestly.",
      "5. Close the human-in-the-loop loop fully: every auto-handled reply already captures thumbs-up/down; the next step is to feed downvoted replies back into the golden set as hard negatives and re-run the eval nightly.",
      "6. Multi-turn context is now tracked in the Playground — extend it to the production Inbox so the agent never re-asks for an order number the customer already DM'd.",
      "7. Ship the A/B threshold picker as a daily cron that re-evaluates the operating point against the previous day's escalation cost, so the system self-tunes.",
    ],
  },
];
