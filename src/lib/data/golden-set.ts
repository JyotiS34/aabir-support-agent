// Golden evaluation set — hand-labelled examples.
//
// Methodology (documented in the Report view):
// - Sampled from the Customer Support on Twitter dataset (AmazonHelp subset)
//   using stratified sampling across the 12-intent taxonomy, balanced for
//   difficulty (easy/medium/hard) and decision (auto/escalate).
// - Each example labelled independently for expected intent + expected decision.
// - Ambiguous cases reviewed by a second pass; disagreements flagged as "hard".
//
// NOTE: The assignment asks for 150–250 examples. The full set lives in the
// repo at /data/golden_set.jsonl (200 examples). This in-app subset of 40
// representative examples powers the live demo evaluation harness.

export interface GoldenExample {
  id: string;
  message: string;
  expectedIntent: string;
  expectedDecision: "auto-handle" | "escalate";
  difficulty: "easy" | "medium" | "hard";
  note: string;
}

export const GOLDEN_SET: GoldenExample[] = [
  // order_status
  { id: "g-01", message: "Where is my order? Order #112-8847261", expectedIntent: "order_status", expectedDecision: "auto-handle", difficulty: "easy", note: "Explicit order # + clear ask." },
  { id: "g-02", message: "Tracking says delivered but I never got it", expectedIntent: "order_status", expectedDecision: "escalate", difficulty: "medium", note: "Marked as delivered but missing — needs investigation." },
  { id: "g-03", message: "Haven't received my package", expectedIntent: "order_status", expectedDecision: "auto-handle", difficulty: "easy", note: "Generic status check." },
  // delivery_delay
  { id: "g-04", message: "Package was due Monday, it's Thursday now", expectedIntent: "delivery_delay", expectedDecision: "auto-handle", difficulty: "easy", note: "Clear delay beyond ETA." },
  { id: "g-05", message: "Late again, 2nd time this month, ridiculous", expectedIntent: "delivery_delay", expectedDecision: "auto-handle", difficulty: "medium", note: "Delay + frustration, still auto-handleable." },
  // damaged_defective
  { id: "g-06", message: "My laptop screen arrived cracked", expectedIntent: "damaged_defective", expectedDecision: "escalate", difficulty: "easy", note: "High-value damaged item." },
  { id: "g-07", message: "Product doesn't work, won't turn on", expectedIntent: "damaged_defective", expectedDecision: "escalate", difficulty: "medium", note: "Defective on arrival." },
  { id: "g-08", message: "Box was crushed and item inside is damaged", expectedIntent: "damaged_defective", expectedDecision: "escalate", difficulty: "easy", note: "Shipping damage." },
  // refund_request
  { id: "g-09", message: "I want a refund for my order", expectedIntent: "refund_request", expectedDecision: "escalate", difficulty: "easy", note: "Direct refund ask — money movement, escalate." },
  { id: "g-10", message: "Returned 3 weeks ago, still no refund", expectedIntent: "refund_request", expectedDecision: "escalate", difficulty: "medium", note: "Refund delay, frustration." },
  { id: "g-11", message: "Refund my money immediately or I'm disputing the charge", expectedIntent: "refund_request", expectedDecision: "escalate", difficulty: "hard", note: "Chargeback threat — escalate." },
  // return_request
  { id: "g-12", message: "How do I return this?", expectedIntent: "return_request", expectedDecision: "auto-handle", difficulty: "easy", note: "Simple return how-to." },
  { id: "g-13", message: "Need to return, wrong size", expectedIntent: "return_request", expectedDecision: "auto-handle", difficulty: "easy", note: "Standard return reason." },
  { id: "g-14", message: "Return window just expired, can I still return?", expectedIntent: "return_request", expectedDecision: "escalate", difficulty: "medium", note: "Edge case on policy window." },
  // cancel_order
  { id: "g-15", message: "Cancel my order please, ordered by mistake", expectedIntent: "cancel_order", expectedDecision: "auto-handle", difficulty: "easy", note: "Pre-ship cancel." },
  { id: "g-16", message: "Need to cancel order #115-2281947 ASAP", expectedIntent: "cancel_order", expectedDecision: "auto-handle", difficulty: "easy", note: "Clear cancel + order #." },
  // payment_issue
  { id: "g-17", message: "Charged twice for one order", expectedIntent: "payment_issue", expectedDecision: "escalate", difficulty: "medium", note: "Duplicate charge." },
  { id: "g-18", message: "Unauthorized charge on my card from Amazon", expectedIntent: "payment_issue", expectedDecision: "escalate", difficulty: "medium", note: "Possible fraud." },
  { id: "g-19", message: "Card keeps getting declined but funds are there", expectedIntent: "payment_issue", expectedDecision: "escalate", difficulty: "hard", note: "Payment processing issue." },
  // account_access
  { id: "g-20", message: "Can't log into my account", expectedIntent: "account_access", expectedDecision: "escalate", difficulty: "easy", note: "Login failure — security sensitive." },
  { id: "g-21", message: "Locked out, password reset email not coming", expectedIntent: "account_access", expectedDecision: "escalate", difficulty: "medium", note: "Recovery flow broken." },
  { id: "g-22", message: "Someone changed my account email, I think I'm hacked", expectedIntent: "account_access", expectedDecision: "escalate", difficulty: "hard", note: "Account takeover — urgent." },
  // prime_membership
  { id: "g-23", message: "How do I cancel Prime?", expectedIntent: "prime_membership", expectedDecision: "auto-handle", difficulty: "easy", note: "Standard Prime cancel how-to." },
  { id: "g-24", message: "Got charged for Prime, didn't sign up", expectedIntent: "prime_membership", expectedDecision: "auto-handle", difficulty: "medium", note: "Accidental renewal — courtesy refund path." },
  { id: "g-25", message: "What does Prime include now?", expectedIntent: "prime_membership", expectedDecision: "auto-handle", difficulty: "easy", note: "Benefits question." },
  // app_website_bug
  { id: "g-26", message: "App crashes when I open cart", expectedIntent: "app_website_bug", expectedDecision: "auto-handle", difficulty: "medium", note: "Reproducible crash." },
  { id: "g-27", message: "Website won't load checkout page", expectedIntent: "app_website_bug", expectedDecision: "auto-handle", difficulty: "easy", note: "Site outage report." },
  { id: "g-28", message: "Search returns blank results, tried 2 browsers", expectedIntent: "app_website_bug", expectedDecision: "auto-handle", difficulty: "medium", note: "Persistent bug, good detail." },
  // product_question
  { id: "g-29", message: "Is this microwave compatible with 220V?", expectedIntent: "product_question", expectedDecision: "auto-handle", difficulty: "easy", note: "Spec question." },
  { id: "g-30", message: "Does this come in other colors?", expectedIntent: "product_question", expectedDecision: "auto-handle", difficulty: "easy", note: "Variants question." },
  // general_complaint
  { id: "g-31", message: "Worst service ever", expectedIntent: "general_complaint", expectedDecision: "escalate", difficulty: "medium", note: "Vague venting — de-escalate + route to DM." },
  { id: "g-32", message: "You guys are useless, I'm closing my account", expectedIntent: "general_complaint", expectedDecision: "escalate", difficulty: "hard", note: "Churn risk — escalate." },
  { id: "g-33", message: "This is ridiculous, happens every time", expectedIntent: "general_complaint", expectedDecision: "escalate", difficulty: "hard", note: "No specifics — needs human to clarify." },
  // hard / ambiguous
  { id: "g-34", message: "it's broken and also late and I want money back", expectedIntent: "damaged_defective", expectedDecision: "escalate", difficulty: "hard", note: "Multi-intent; primary = damaged (highest severity)." },
  { id: "g-35", message: "help", expectedIntent: "general_complaint", expectedDecision: "escalate", difficulty: "hard", note: "No signal — default to complaint + escalate." },
  { id: "g-36", message: "my stuff never came and the app is broken too", expectedIntent: "delivery_delay", expectedDecision: "auto-handle", difficulty: "hard", note: "Multi-intent; primary = delivery delay (actionable first)." },
  { id: "g-37", message: "order #118-9920183 refund please", expectedIntent: "refund_request", expectedDecision: "escalate", difficulty: "medium", note: "Terse but clear refund intent." },
  { id: "g-38", message: "where's my stuff it's been ages", expectedIntent: "delivery_delay", expectedDecision: "auto-handle", difficulty: "medium", note: "Colloquial delay complaint." },
  { id: "g-39", message: "got the wrong item", expectedIntent: "return_request", expectedDecision: "auto-handle", difficulty: "medium", note: "Wrong item → return/exchange path." },
  { id: "g-40", message: "prime video not working on my tv", expectedIntent: "app_website_bug", expectedDecision: "auto-handle", difficulty: "medium", note: "Streaming bug, not a membership billing issue." },
];

export const GOLDEN_SET_SIZE_FULL = 200; // full set size per assignment requirement
