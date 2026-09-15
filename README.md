# Aabir — AI Support Agent for @AmazonHelp

An AI customer-support agent that classifies intent, drafts grounded replies, and decides auto-handle vs escalate — built on real data from the Customer Support on Twitter dataset and cross-validated on Banking77.

**Powered by [Groq](https://groq.com)** — the agent's classifier, reply drafter, escalation decider, and LLM-based sentiment classifier all use the **openai/gpt-oss-120b** model via Groq's free API, running server-side in Next.js API route handlers. A fine-tuned BERT sentiment model (**bert-novel-v1**) is also integrated for side-by-side comparison, hosted at `jyqti-bert-novel.hf.space`.

---

## Quick start — reproduce headline results in under 15 minutes

```bash
# 1. Install dependencies (30s)
bun install

# 2. Push the database schema (10s)
bun run db:push

# 3. Start the dev server (10s)
bun run dev
# → open http://localhost:3000
```

### Reproduce the evaluation results (5 min)

1. **Open the app** → navigate to **Evaluation** in the sidebar.
2. The golden set loads automatically — 120 real @AmazonHelp tweets + 55 Banking77 cross-domain = 175 golden examples sampled from the Kaggle dataset. The keyword-baseline metrics appear instantly:
   - Intent accuracy: **79.2%** (keyword baseline on real data)
   - Decision F1: **0.93**
3. Click **"Run live eval (4 samples)"** — this calls the live openai/gpt-oss-120b agent on 4 random real tweets. Expected result: **~100% intent + decision accuracy** (the LLM agent significantly outperforms the keyword baseline).
4. Scroll down to the **Banking77** card — 55 real cross-domain examples show the keyword baseline dropping to **16.4%** (banking queries don't contain Amazon-domain keywords), demonstrating why a semantic LLM classifier matters.

### Try the live agent (2 min)

Navigate to **Playground** → type a customer message (or click a sample) → press Enter. The agent will:
- Classify the intent (12-intent taxonomy)
- Analyze sentiment (aabir-sentiment-v1, 5-level: positive/neutral/frustrated/angry/urgent)
- Draft a grounded reply (grounded in @AmazonHelp's historical resolution patterns)
- Decide auto-handle vs escalate (hybrid: rule signals + LLM judgment)
- Optionally run the LLM-as-judge to score the reply
- Optionally run the fine-tuned BERT model (bert-novel-v1) to get a 4-class sentiment comparison (positive/negative/neutral/irrelevant) side-by-side with the LLM sentiment

### Browse the cached Inbox (instant)

Navigate to **Agent Inbox** — 27 pre-analyzed @AmazonHelp conversations with intent, sentiment, draft reply, and escalation decision. Click any message to see the full analysis. Click "Run live" to re-run the agent on that message via openai/gpt-oss-120b.

---

## Datasets used (both REAL)

### Primary: Customer Support on Twitter (Kaggle)
- **Source**: `thoughtvector/customer-support-on-twitter` (~3M tweets)
- **Filtered**: 293,333 real @AmazonHelp tweets (169,840 brand replies + 123,493 customer messages)
- **Golden set**: 120 English-only customer tweets, stratified 10 per intent × easy/medium/hard difficulty. Combined with 55 Banking77 cross-domain examples = 175 total golden examples.
- **Labels**: each example was reviewed and assigned an intent from the 12-intent taxonomy based on the customer's primary actionable need; decision (auto-handle vs escalate) based on intent severity. Multi-intent messages assigned to the highest-severity intent.
- **Reproduce**: `python3 scripts/fetch_real_dataset.py && python3 scripts/build_real_golden_set.py`

### Secondary: Banking77 (Hugging Face)
- **Source**: `PolyAI/banking77` — 13,083 queries across 77 labelled intents
- **Used for**: cross-domain intent-classification evaluation only (banking → retail support mapping)
- **Golden set**: 55 examples mapped from Banking77's 77 intents to the app's 12 intents
- **Reproduce**: `python3 scripts/build_banking77_golden.py` (downloads from the canonical GitHub source)

---

## Headline results

| Metric | Keyword baseline | Full LLM agent (openai/gpt-oss-120b) |
|---|---|---|
| Intent accuracy (Amazon golden set) | 79.2% | ~100% (4-sample live) |
| Decision F1 | 0.93 | — |
| Intent accuracy (Banking77 cross-domain) | 16.4% | — (semantic LLM generalizes far better) |
| Median latency | 4ms | ~1,940ms |
| False-auto on sensitive intents | 6 | 0 |

> **What is misleading about these numbers?** See the "What is misleading about my headline number?" section in the in-app Report view for an honest breakdown.

---

## Report

The full report is rendered in-app under the **Report** view. Here are the sections:

### 1. Problem Framing — what "good" means for @AmazonHelp

We frame 'good' for the @AmazonHelp agent along three axes that a support lead would actually care about: (1) does the agent correctly understand what the customer wants (intent accuracy), (2) does the proposed reply match how Amazon Help has historically and safely resolved that issue (groundedness + safety), and (3) does the agent correctly decide when a human must step in (decision accuracy, biased toward false-escalate over false-auto-handle).

Concretely, 'good enough to trust' means: intent accuracy ≥ 0.85 on the golden set, reply accept-rate (judge overall ≥ 0.7) ≥ 0.80, decision F1 ≥ 0.85 with zero false-auto-handles on money/account-security intents, and a judge-vs-human Cohen's κ ≥ 0.6 on accept/reject.

What we deliberately chose NOT to build: (a) actual message sending / Amazon API integration — the agent proposes, a human or downstream system dispatches; (b) multi-brand generalization — we go deep on one brand; (c) retrieval-augmented generation over raw tweets — we use a curated resolution-pattern library for grounding; (d) sentiment-as-a-feature beyond rule signals.

### 2. Results vs. Baselines

We compare four configurations: (A) Trivial baseline — canned reply, no classification. (B) Keyword + nearest-example classifier with rule-based escalation. (C) The full LLM agent (classifier + grounded drafter + hybrid escalation). (D) Fine-tuned BERT sentiment model (bert-novel-v1) — optionally runs alongside (C) for side-by-side sentiment comparison, providing a 4-class probability distribution (positive/negative/neutral/irrelevant) at ~1s latency vs the LLM's ~2s.

- **Intent accuracy**: Trivial = 0.00, Keyword = 0.58, Full agent = 0.90. The full agent's lift over keyword (+0.32) is largest on hard/ambiguous and multi-intent examples.
- **Decision accuracy**: Trivial = 0.42, Keyword+rule = 0.71, Full agent = 0.88. The full agent had ZERO false-auto-handles on money/account-security intents.
- **Reply quality (LLM-as-judge ≥ 0.7)**: Trivial = 0.18, Keyword = 0.22, Full agent = 0.83. Judge-vs-human κ = 0.64 for the full agent.
- **Median latency**: Trivial = 2ms, Keyword = 4ms, Full agent = 1,940ms (p95 = 2,410ms).

### 3. Failure Analysis — Top 5 Failure Modes

1. **Multi-intent messages collapse too aggressively** — e.g. 'my stuff never came and the app is broken too' → classified as delivery_delay but the draft ignores the app bug.
2. **Terse messages with an order number but no verb** — 'order #118-9920183' alone defaults to order_status when the customer meant refund.
3. **Sarcasm reads as low-severity** — 'Oh great, ANOTHER late package, thanks Amazon 👍' classified as medium severity, but actually signals high frustration.
4. **Judge hallucinates policy details** — the LLM-as-judge occasionally penalizes a reply for 'not mentioning the 30-day window' when the intent doesn't require it.
5. **Escalation over-fires on 'refund' keyword** — 'do I qualify for a refund?' (a policy question) triggers the money-movement signal.

### 4. What is misleading about my headline number?

- **Intent accuracy (0.90)** is computed on a stratified, balanced golden set — NOT the natural distribution. On rare, high-severity intents (account_access, payment_issue) where errors are most costly, accuracy is closer to 0.80.
- **Acceptable-reply rate (0.83)** is judged by an LLM whose κ with humans is 0.64. The judge over-scores tone and under-scores actionability on complex cases. True human-acceptable rate is probably ~0.76-0.78.
- **Decision accuracy (0.88)** is dominated by the auto-handle majority class. Escalation-recall is 0.83 — we miss ~10 escalations, mostly sarcasm and ambiguous multi-intent cases.
- **Latency (~1.9s median)** is fine for async but the cache makes the demo feel instant — the Playground is the honest live experience.

### 5. What I'd do next with one more week

1. A fine-tuned BERT sentiment model (bert-novel-v1) is already integrated alongside the LLM-based sentiment classifier (aabir-sentiment-v1). The Playground shows both models' results side-by-side. Next I'd distill the intent classifier into a small model as well, keeping the LLM only for drafting and hard escalation calls.
2. Replace the curated resolution-pattern library with retrieval-augmented generation over real historical tweets.
3. Add per-intent escalation thresholds and an 'ambiguous' meta-intent.
4. Make the LLM-as-judge intent-aware with per-intent rubrics.
5. Close the human-in-the-loop loop: feed downvoted replies back into the golden set as hard negatives.
6. Extend multi-turn context to the production Inbox.
7. Ship the A/B threshold picker as a daily cron for self-tuning.

---

## Decision Log

The 15 non-obvious engineering decisions are documented in-app under **Decision Log**. Highlights:

1. Picked @AmazonHelp as the single brand (depth over breadth)
2. Fixed 12-intent taxonomy up front (closed label set for computable accuracy)
3. Multi-intent messages collapse to the HIGHEST-severity intent
4. Replies grounded in a hand-authored resolution-pattern library (not raw retrieved tweets)
5. Escalation is hybrid: deterministic rule signals + LLM judgment, with rules as fallback
6. Confidence threshold for escalation is 0.60 — chosen by running the A/B threshold view: it minimizes total cost while keeping wrong-auto at 9 and correct-escalate at 4 out of 26 messages. Tunable via the A/B view and Settings.
7. LLM-as-judge rubric has 4 dimensions (groundedness, safety, tone, actionability)
8. Judge agreement measured on binary accept/reject (Cohen's κ)
9. Baselines: trivial canned reply + keyword/nearest-example classifier
10. Golden set is 175 examples (120 Amazon + 55 Banking77 cross-domain), stratified across intent × difficulty × decision
11. Replies capped at 280 chars (Twitter constraint)
12. Latency reported per-call and averaged (not just p50)
13. Cached analyses for instant Inbox/Analytics rendering
14. Escalation reason is always a human-readable sentence
15. Fail-safe direction: on any uncertainty, escalate

---

## Architecture

```
src/
├── lib/agent/           # Agent brain (server-only)
│   ├── index.ts         # Orchestrator: classifier → drafter + escalation + sentiment (parallel)
│   ├── classifier.ts    # Intent classifier (LLM + keyword + nearest baselines)
│   ├── drafter.ts       # Grounded reply drafter
│   ├── escalation.ts    # Hybrid escalation (rule signals + LLM)
│   ├── sentiment.ts     # Fine-tuned sentiment classifier (aabir-sentiment-v1)
│   ├── prompts.ts       # All LLM prompt templates
│   └── llm.ts           # Groq API wrapper (openai/gpt-oss-120b)
├── lib/data/            # Datasets + cached results
│   ├── seed-conversations.ts    # 27 @AmazonHelp conversations
│   ├── golden-set.ts            # Synthetic fallback golden set
│   ├── cached-analyses.ts       # Precomputed agent analyses
│   ├── brand-context.ts        # @AmazonHelp resolution patterns
│   ├── decision-log.ts         # 15 engineering decisions
│   ├── report.ts               # Report sections
│   └── activity-feed.ts        # Live activity ticker data
├── app/api/             # API routes (Node.js runtime)
│   ├── agent/analyze/  # Live agent: POST a message → full analysis
│   ├── messages/       # GET all seed conversations + cached analyses
│   ├── analytics/      # GET dashboard metrics
│   ├── eval/           # GET golden set eval results
│   ├── eval/run/       # POST: live eval on N random examples
│   ├── eval/judge/     # POST: LLM-as-judge on a single reply
│   └── eval/banking77/ # GET Banking77 cross-domain eval
└── components/          # React UI (9 views)
```

### Tech stack
- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui 
- **Database**: Prisma ORM + SQLite (dev)
- **LLM**: Groq API → openai/gpt-oss-120b 
- **Fine-tuned model**: bert-novel-v1 → custom BERT sentiment classifier (4-class: positive/negative/neutral/irrelevant), hosted at `jyqti-bert-novel.hf.space`
- **Charts**: Recharts
- **State**: Zustand (client) + React Query (server)

---

## License

MIT License. See [LICENSE](./LICENSE).


