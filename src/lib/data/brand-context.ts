// Brand profile + historical reply patterns for @AmazonHelp.
// These are realistic, synthesized resolution patterns inspired by the
// Customer Support on Twitter dataset (thoughtvector/customer-support-on-twitter).
// Used to GROUND the agent's drafted replies in how the brand historically replies.

export interface BrandProfile {
  handle: string;
  name: string;
  displayName: string;
  tagline: string;
  voiceGuidelines: string[];
  policyHighlights: string[];
  // Canonical resolution patterns keyed by intent
  resolutionPatterns: Record<string, ResolutionPattern>;
}

export interface ResolutionPattern {
  intent: string;
  // How the brand has historically opened / handled / closed this intent
  opening: string[];
  resolutionSteps: string[];
  closing: string[];
  // Typical asks (what the brand needs from the customer)
  typicalAsks: string[];
  // Typical outcome
  typicalOutcome: string;
}

export const BRAND: BrandProfile = {
  handle: "AmazonHelp",
  name: "Amazon Help",
  displayName: "Amazon Help",
  tagline: "Official customer support for Amazon. We're here to help 24/7.",
  voiceGuidelines: [
    "Always greet warmly and address the customer by name when possible.",
    "Keep replies under 280 characters where possible (Twitter).",
    "Never request full card numbers, passwords, or SSNs publicly.",
    "Move sensitive account specifics to DM with a clear reason.",
    "Acknowledge the inconvenience before pivoting to resolution.",
    "Use 'we' to reinforce team ownership; avoid blaming the customer.",
    "End with a clear next step, never leave the customer guessing.",
  ],
  policyHighlights: [
    "Return window: 30 days for most items (extended for holidays).",
    "Refunds to original payment method in 3-5 business days.",
    "A-to-z Guarantee covers damaged/undelivered items.",
    "Prime cancellations process within 1-2 business days.",
    "Order cancellation only possible before 'Shipping Soon' status.",
  ],
  resolutionPatterns: {
    order_status: {
      intent: "order_status",
      opening: [
        "Hi {name}, sorry for the wait! Let's locate your order.",
        "Hey {name}, happy to help track that down for you.",
      ],
      resolutionSteps: [
        "Ask the customer to DM their order number (never post publicly).",
        "Confirm the shipping carrier and latest tracking scan.",
        "If tracking is stale >48h, file a trace with the carrier.",
      ],
      closing: [
        "Please DM us your order number and we'll pull it up right away: https://amzn.to/dm",
        "Slide into our DMs with the order # and we'll take a look.",
      ],
      typicalAsks: ["Order number", "Name on account"],
      typicalOutcome: "Provide tracking link or file carrier trace.",
    },
    delivery_delay: {
      intent: "delivery_delay",
      opening: [
        "Hi {name}, we know waiting past the delivery date is frustrating.",
        "Sorry your package is running late, {name}. Let's sort this out.",
      ],
      resolutionSteps: [
        "Confirm the original estimated delivery date has passed.",
        "Allow 48h grace for carrier scan updates.",
        "If still missing, offer full refund or free replacement.",
      ],
      closing: [
        "If it doesn't arrive in the next 48h, we'll refund or replace—your call. DM us the order #.",
        "Please DM your order number so we can issue a replacement or refund.",
      ],
      typicalAsks: ["Order number", "Preferred resolution (refund vs replacement)"],
      typicalOutcome: "Refund or expedited replacement shipped.",
    },
    damaged_defective: {
      intent: "damaged_defective",
      opening: [
        "Oh no, sorry your item arrived damaged, {name}.",
        "That's not the experience we want, {name}. Let's make it right.",
      ],
      resolutionSteps: [
        "Request a photo of the damage (helps our quality team).",
        "Issue a prepaid return label + replacement or full refund.",
        "Log the defect code for the seller/fulfillment center.",
      ],
      closing: [
        "Please DM us your order # and a photo of the damage and we'll send a label + replacement.",
        "DM your order number and a quick photo so we can expedite a replacement.",
      ],
      typicalAsks: ["Order number", "Photo of damage", "Replacement or refund preference"],
      typicalOutcome: "Prepaid return label + replacement or refund under A-to-z.",
    },
    refund_request: {
      intent: "refund_request",
      opening: [
        "Hi {name}, let's get that refund sorted.",
        "Sorry for the trouble, {name}. We'll look into the charge.",
      ],
      resolutionSteps: [
        "Verify the charge against the order in the backend.",
        "If duplicate/erroneous, issue refund to original payment method.",
        "Confirm 3-5 business day bank processing window.",
      ],
      closing: [
        "Please DM your order # and we'll verify the charge and process the refund.",
        "DM us the order number and last 4 of the card so we can locate the charge.",
      ],
      typicalAsks: ["Order number", "Last 4 digits of card", "Date of charge"],
      typicalOutcome: "Refund issued to original payment method.",
    },
    return_request: {
      intent: "return_request",
      opening: [
        "Hi {name}, happy to help start that return.",
        "No problem, {name}—let's get a return label to you.",
      ],
      resolutionSteps: [
        "Confirm the item is within the 30-day return window.",
        "Generate a prepaid return label in Your Orders.",
        "Explain refund processes 2 days after we receive the item back.",
      ],
      closing: [
        "Go to Your Orders > Return or Replace Items to print a free label. Let us know if it errors!",
        "DM your order # if the return option isn't showing and we'll enable it.",
      ],
      typicalAsks: ["Order number", "Reason for return"],
      typicalOutcome: "Prepaid label generated; refund after item received.",
    },
    cancel_order: {
      intent: "cancel_order",
      opening: [
        "Hi {name}, let's see if we can still cancel that.",
        "Happy to try, {name}—cancellation depends on the order status.",
      ],
      resolutionSteps: [
        "Check if order is still in 'Not Yet Shipped' status.",
        "If yes, cancel from backend; funds release in 1-2 days.",
        "If shipped, advise refusal at door or initiate a return on delivery.",
      ],
      closing: [
        "If it hasn't shipped, you can cancel via Your Orders. DM us the order # if the button's missing.",
        "DM your order number—if it hasn't hit 'Shipping Soon' we'll cancel it for you.",
      ],
      typicalAsks: ["Order number"],
      typicalOutcome: "Order cancelled pre-ship, or return initiated post-ship.",
    },
    payment_issue: {
      intent: "payment_issue",
      opening: [
        "Hi {name}, a double charge is definitely something we take seriously.",
        "Sorry about the payment trouble, {name}. Let's investigate.",
      ],
      resolutionSteps: [
        "Distinguish authorization hold from an actual charge.",
        "If genuine duplicate, refund the second charge immediately.",
        "Escalate to payments team if fraud indicators present.",
      ],
      closing: [
        "Please DM your order # and the last 4 of the card so our payments team can verify.",
        "This one needs our payments specialists—DM your order # and we'll escalate securely.",
      ],
      typicalAsks: ["Order number", "Last 4 of card", "Screenshot of charge"],
      typicalOutcome: "Duplicate refunded; potential fraud escalated.",
    },
    account_access: {
      intent: "account_access",
      opening: [
        "Hi {name}, being locked out is stressful—let's get you back in.",
        "Sorry you can't access your account, {name}.",
      ],
      resolutionSteps: [
        "Route to password reset / 2FA recovery flow (never reset via public tweet).",
        "If account locked for security, escalate to account protection team.",
        "Verify identity via registered email/phone in DM only.",
      ],
      closing: [
        "For your security we handle account access only in DM—please DM us and we'll verify your identity.",
        "Head to amazon.com/reset or DM us to start secure identity verification.",
      ],
      typicalAsks: ["Registered email", "Name on account"],
      typicalOutcome: "Secure identity verification → account restored.",
    },
    prime_membership: {
      intent: "prime_membership",
      opening: [
        "Hi {name}, happy to help with your Prime membership.",
        "Let's sort out that Prime question, {name}.",
      ],
      resolutionSteps: [
        "Clarify if it's a billing, cancellation, or benefits question.",
        "For cancellation, confirm auto-renew is turned off.",
        "For accidental renewal, check eligibility for courtesy refund.",
      ],
      closing: [
        "You can manage Prime at amazon.com/membership, or DM us to check renewal status.",
        "DM us and we'll review your Prime billing and renewal settings.",
      ],
      typicalAsks: ["Account email", "Specific charge date"],
      typicalOutcome: "Prime managed/refunded per policy.",
    },
    app_website_bug: {
      intent: "app_website_bug",
      opening: [
        "Sorry the app's giving you trouble, {name}.",
        "Thanks for flagging that, {name}—let's troubleshoot.",
      ],
      resolutionSteps: [
        "Capture device, OS, app version, and error text.",
        "Suggest standard fixes: clear cache, update app, retry.",
        "Log the bug for the app team if persistent.",
      ],
      closing: [
        "Try force-closing and updating the app; if it persists, DM us your device + OS and a screenshot.",
        "DM us a screenshot and your device/OS so we can file this with our app team.",
      ],
      typicalAsks: ["Device + OS", "App version", "Screenshot of error"],
      typicalOutcome: "Workaround provided; bug logged for engineering.",
    },
    product_question: {
      intent: "product_question",
      opening: [
        "Great question, {name}!",
        "Happy to help with that product detail, {name}.",
      ],
      resolutionSteps: [
        "Pull product specs from the catalog.",
        "Link to the product detail page or customer Q&A section.",
        "If unknown, route to the seller via the product page 'Ask a question'.",
      ],
      closing: [
        "Full specs are on the product page under 'Product Information'—let us know if you still have questions!",
        "You can also ask the seller directly via 'Have a question?' on the listing.",
      ],
      typicalAsks: ["ASIN or product link"],
      typicalOutcome: "Specs provided or routed to seller.",
    },
    general_complaint: {
      intent: "general_complaint",
      opening: [
        "We hear you, {name}, and we're sorry for the frustration.",
        "That's not the bar we set for ourselves, {name}.",
      ],
      resolutionSteps: [
        "Acknowledge the sentiment without being defensive.",
        "Ask a clarifying question to convert to a solvable intent.",
        "Move to DM to gather specifics and de-escalate publicly.",
      ],
      closing: [
        "We'd like to make this right—please DM us the details so we can dig in.",
        "DM us what happened and we'll personally look into it.",
      ],
      typicalAsks: ["Order number", "What specifically happened"],
      typicalOutcome: "Converted to a concrete intent in DM; de-escalated.",
    },
  },
};

export function getResolutionPattern(intentId: string): ResolutionPattern | undefined {
  return BRAND.resolutionPatterns[intentId];
}
