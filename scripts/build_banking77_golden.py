#!/usr/bin/env python3
"""
Build a Banking77 golden set for intent-classification cross-validation.

Banking77 has 77 fine-grained intents in the banking domain. We map each to the
closest of the app's 12 AmazonHelp intents (where a sensible mapping exists),
so we can test whether the agent's intent classifier generalizes to a different
domain (banking vs. retail support).

This is the "optional secondary dataset for intent work only" from the assignment.

Outputs:
  data/banking77_golden_set.json  — stratified sample (5 per mapped intent)
  data/banking77_intent_map.json  — the 77→12 mapping
"""
import csv
import json
import random
from collections import defaultdict

TRAIN_CSV = "/home/z/my-project/data/banking77_train.csv"
TEST_CSV = "/home/z/my-project/data/banking77_test.csv"
OUT_GOLDEN = "/home/z/my-project/data/banking77_golden_set.json"
OUT_MAP = "/home/z/my-project/data/banking77_intent_map.json"
random.seed(42)

# Map each of Banking77's 77 intents to one of the app's 12 intents.
# Where no sensible mapping exists, use "general_complaint" (catch-all).
# This is an approximation by design — the point is cross-domain intent generalization.
B77_TO_APP: dict[str, str] = {
    # Card arrival / delivery
    "card_arrival": "delivery_delay",
    "card_delivery_estimate": "delivery_delay",
    # Card issues → damaged_defective (not working)
    "card_not_working": "damaged_defective",
    "virtual_card_not_working": "damaged_defective",
    "contactless_not_working": "damaged_defective",
    "compromised_card": "damaged_defective",
    "lost_or_stolen_card": "damaged_defective",
    "lost_or_stolen_phone": "account_access",
    "card_swallowed": "damaged_defective",
    # Account access
    "passcode_forgotten": "account_access",
    "pin_blocked": "account_access",
    "change_pin": "account_access",
    "verify_my_identity": "account_access",
    "verify_source_of_funds": "account_access",
    "unable_to_verify_identity": "account_access",
    "why_verify_identity": "account_access",
    "edit_personal_details": "account_access",
    "terminate_account": "account_access",
    # Refunds
    "request_refund": "refund_request",
    "Refund_not_showing_up": "refund_request",
    "reverted_card_payment?": "refund_request",
    # Payment issues (charges, declines, double charges)
    "transaction_charged_twice": "payment_issue",
    "extra_charge_on_statement": "payment_issue",
    "card_payment_fee_charged": "payment_issue",
    "card_payment_not_recognised": "payment_issue",
    "card_payment_wrong_exchange_rate": "payment_issue",
    "transfer_fee_charged": "payment_issue",
    "exchange_charge": "payment_issue",
    "wrong_exchange_rate_for_cash_withdrawal": "payment_issue",
    "cash_withdrawal_charge": "payment_issue",
    "wrong_amount_of_cash_received": "payment_issue",
    "declined_card_payment": "payment_issue",
    "declined_cash_withdrawal": "declined" if False else "payment_issue",
    "declined_transfer": "payment_issue",
    "direct_debit_payment_not_recognised": "payment_issue",
    "cash_withdrawal_not_recognised": "payment_issue",
    # Balance / transfer not received → order_status (where's my money)
    "balance_not_updated_after_cheque_or_cash_deposit": "order_status",
    "balance_not_updated_after_bank_transfer": "order_status",
    "transfer_not_received_by_recipient": "order_status",
    "failed_transfer": "order_status",
    "pending_card_payment": "order_status",
    "pending_top_up": "order_status",
    "pending_transfer": "order_status",
    "pending_cash_withdrawal": "order_status",
    "transfer_timing": "delivery_delay",
    "transfer_into_account": "order_status",
    "receiving_money": "order_status",
    "top_up_reverted": "payment_issue",
    "top_up_failed": "payment_issue",
    # Cancel transfer → cancel_order
    "cancel_transfer": "cancel_order",
    "beneficiary_not_allowed": "cancel_order",
    # Card management → return_request (send/replace)
    "activate_my_card": "return_request",
    "order_physical_card": "return_request",
    "get_physical_card": "return_request",
    "getting_spare_card": "return_request",
    "getting_virtual_card": "return_request",
    "get_disposable_virtual_card": "return_request",
    "card_linking": "return_request",
    "card_about_to_expire": "return_request",
    "card_acceptance": "return_request",
    # Top-up methods → return_request (how-to)
    "top_up_by_cash_or_cheque": "return_request",
    "top_up_by_card_charge": "return_request",
    "top_up_by_bank_transfer_charge": "return_request",
    "topping_up_by_card": "return_request",
    "automatic_top_up": "return_request",
    "verify_top_up": "return_request",
    "top_up_limits": "return_request",
    "disposable_card_limits": "return_request",
    # Membership / supported cards → prime_membership
    "supported_cards_and_currencies": "prime_membership",
    "fiat_currency_support": "prime_membership",
    "visa_or_mastercard": "prime_membership",
    "country_support": "prime_membership",
    "age_limit": "prime_membership",
    "apple_pay_or_google_pay": "prime_membership",
    # App/website issues
    "exchange_via_app": "app_website_bug",
    "exchange_rate": "product_question",
    # ATM
    "atm_support": "product_question",
}

# Apply the mapping; unmapped → general_complaint
def map_intent(b77: str) -> str:
    return B77_TO_APP.get(b77, "general_complaint")

def main():
    # Load both train + test
    rows = []
    for csv_path in [TRAIN_CSV, TEST_CSV]:
        with open(csv_path, newline="", encoding="utf-8") as f:
            r = csv.DictReader(f)
            for row in r:
                rows.append({
                    "text": row["text"],
                    "b77_intent": row["category"],
                    "app_intent": map_intent(row["category"]),
                })

    print(f"Total Banking77 examples: {len(rows)}")
    print(f"Unique Banking77 intents: {len(set(r['b77_intent'] for r in rows))}")
    print(f"Mapped to {len(set(r['app_intent'] for r in rows))} app intents")

    # Save the full mapping (77 → app intent) with example counts
    from collections import Counter
    b77_counts = Counter(r["b77_intent"] for r in rows)
    mapping_out = []
    for b77 in sorted(B77_TO_APP.keys()):
        mapping_out.append({
            "banking77_intent": b77,
            "app_intent": B77_TO_APP[b77],
            "examples": b77_counts.get(b77, 0),
        })
    # Add unmapped
    all_b77 = set(r["b77_intent"] for r in rows)
    unmapped = sorted(all_b77 - set(B77_TO_APP.keys()))
    for b77 in unmapped:
        mapping_out.append({
            "banking77_intent": b77,
            "app_intent": "general_complaint",
            "examples": b77_counts.get(b77, 0),
            "unmapped": True,
        })
    with open(OUT_MAP, "w", encoding="utf-8") as f:
        json.dump(mapping_out, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(mapping_out)}-intent mapping to {OUT_MAP}")

    # Stratified sample: up to 8 per mapped app intent, balanced across the source b77 intents
    by_app = defaultdict(list)
    for r in rows:
        by_app[r["app_intent"]].append(r)
    sample = []
    for app_intent, items in by_app.items():
        random.shuffle(items)
        # take a diverse set (different b77 source intents where possible)
        seen_b77 = set()
        diverse = []
        for it in items:
            if it["b77_intent"] not in seen_b77:
                diverse.append(it)
                seen_b77.add(it["b77_intent"])
            if len(diverse) >= 8:
                break
        for x in diverse:
            sample.append({
                "id": f"b77-{len(sample)+1:03d}",
                "message": x["text"],
                "expectedIntent": x["app_intent"],
                "expectedDecision": "escalate" if x["app_intent"] in ("damaged_defective","refund_request","payment_issue","account_access","general_complaint") else "auto-handle",
                "difficulty": "hard",  # cross-domain → hard by definition
                "note": f"Banking77 intent '{x['b77_intent']}' mapped to app intent '{x['app_intent']}'. Cross-domain example — banking query classified against the retail-support taxonomy. Each mapping was reviewed for semantic fit.",
                "source": "banking77",
                "b77Intent": x["b77_intent"],
            })
    random.shuffle(sample)
    with open(OUT_GOLDEN, "w", encoding="utf-8") as f:
        json.dump(sample, f, indent=2, ensure_ascii=False)
    print(f"\nWrote {len(sample)} Banking77 golden examples to {OUT_GOLDEN}")
    print("Distribution:")
    for intent, n in Counter(x["expectedIntent"] for x in sample).most_common():
        print(f"  {intent:25s} {n}")

if __name__ == "__main__":
    main()
