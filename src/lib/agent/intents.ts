// Intent taxonomy for @AmazonHelp support agent
// Derived from patterns in the Customer Support on Twitter dataset for Amazon.

export type IntentId =
  | "order_status"
  | "delivery_delay"
  | "damaged_defective"
  | "refund_request"
  | "return_request"
  | "cancel_order"
  | "payment_issue"
  | "account_access"
  | "prime_membership"
  | "app_website_bug"
  | "product_question"
  | "general_complaint";

export interface IntentDef {
  id: IntentId;
  label: string;
  description: string;
  examples: string[];
  autoHandleable: boolean; // can typically be auto-handled
  severity: "low" | "medium" | "high";
}

export const INTENTS: IntentDef[] = [
  {
    id: "order_status",
    label: "Order Status Inquiry",
    description: "Customer asking where their order is or for tracking info.",
    examples: ["Where is my order?", "Tracking not updating", "Haven't received my package"],
    autoHandleable: true,
    severity: "low",
  },
  {
    id: "delivery_delay",
    label: "Delivery Delay",
    description: "Package is late beyond the estimated delivery date.",
    examples: ["Package is 5 days late", "Estimated delivery passed", "Still waiting on my order"],
    autoHandleable: true,
    severity: "medium",
  },
  {
    id: "damaged_defective",
    label: "Damaged / Defective Item",
    description: "Item arrived broken, damaged, or not working.",
    examples: ["Screen is cracked", "Item arrived broken", "Product doesn't turn on"],
    autoHandleable: false,
    severity: "high",
  },
  {
    id: "refund_request",
    label: "Refund Request",
    description: "Customer wants money back for an order or charge.",
    examples: ["I want a refund", "Refund my money", "Charged twice, need refund"],
    autoHandleable: false,
    severity: "high",
  },
  {
    id: "return_request",
    label: "Return Request",
    description: "Customer wants to initiate a return.",
    examples: ["How do I return this?", "Need to return an item", "Return window expired?"],
    autoHandleable: true,
    severity: "low",
  },
  {
    id: "cancel_order",
    label: "Cancel Order",
    description: "Customer wants to cancel an order before shipping.",
    examples: ["Cancel my order please", "Need to cancel order #12345", "How to cancel?"],
    autoHandleable: true,
    severity: "medium",
  },
  {
    id: "payment_issue",
    label: "Payment / Charge Issue",
    description: "Unauthorized charges, failed payments, double charges.",
    examples: ["Charged twice", "Card declined", "Unauthorized charge"],
    autoHandleable: false,
    severity: "high",
  },
  {
    id: "account_access",
    label: "Account / Login Issue",
    description: "Can't log in, locked account, password reset, 2FA.",
    examples: ["Locked out of account", "Can't log in", "Need password reset"],
    autoHandleable: false,
    severity: "high",
  },
  {
    id: "prime_membership",
    label: "Prime Membership",
    description: "Questions about Prime subscription, billing, cancellation.",
    examples: ["Cancel Prime", "Prime charge I didn't authorize", "Prime benefits question"],
    autoHandleable: true,
    severity: "medium",
  },
  {
    id: "app_website_bug",
    label: "App / Website Bug",
    description: "Site or app not working, error messages, broken features.",
    examples: ["App keeps crashing", "Website won't load", "Checkout button broken"],
    autoHandleable: true,
    severity: "medium",
  },
  {
    id: "product_question",
    label: "Product Question",
    description: "Pre-purchase or product detail questions.",
    examples: ["Does this come in other colors?", "Is this compatible with X?", "What's the warranty?"],
    autoHandleable: true,
    severity: "low",
  },
  {
    id: "general_complaint",
    label: "General Complaint / Other",
    description: "Vague dissatisfaction, venting, or off-topic.",
    examples: ["This is ridiculous", "Worst service ever", "You guys suck"],
    autoHandleable: false,
    severity: "high",
  },
];

export const INTENT_MAP: Record<string, IntentDef> = Object.fromEntries(
  INTENTS.map((i) => [i.id, i]),
);

export function getIntent(id: string): IntentDef | undefined {
  return INTENT_MAP[id];
}

// Severity → escalation bias
export const SEVERITY_ESCALATION_BIAS: Record<string, number> = {
  low: 0.05,
  medium: 0.25,
  high: 0.6,
};
