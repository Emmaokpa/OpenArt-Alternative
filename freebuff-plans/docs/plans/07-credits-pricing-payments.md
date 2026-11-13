# 08 — Credits, Pricing and Payments

> Prices below came from provider and reseller pages in 2026 and change often. Re-check before launch. Provider costs live in the `models` table so repricing is a data change.

## Credit costs (what the user pays)

| Action | Credits | Provider cost (approx.) |
|---|---|---|
| Image, fast (Flux Schnell) | 2 | ~$0.003 |
| Image, quality (Flux Dev / Pro class) | 8 | ~$0.025–0.04 |
| Text/Image → video, Wan, 5 s | 90 | ~$0.25–0.35 |
| Text/Image → video, Seedance Fast, 5 s | 180 | ~$0.55–0.80 |
| Lip sync on a video, per 10 s | 25 | ~$0.07–0.12 (VEED/Sync-class, $0.40–0.70/min) |
| Talking avatar (image + audio), per 10 s | 250 | ~$1.33 if priced like sync-3 at $8/min — test cheaper models |
| Captions, per video minute | 3 | < $0.01 |

Per-second prices for video scale linearly with duration (Wan 18 credits/s, Seedance Fast 36 credits/s at the 5-second rate above). Lock the formula:

```
credits = ceil( provider_cost_usd × markup ÷ credit_value_usd )
markup target = 2.5×   (cost ≈ 40% of retail value)
credit_value_usd = 0.01 at the Starter rate
```

## Plans (monthly)

| Plan | Price | Credits | $/credit | Roughly buys |
|---|---|---|---|---|
| **Starter** | $8 | 800 | 0.0100 | ~8 Wan clips, or ~4 Seedance clips, or ~400 fast images |
| **Creator** | $15 | 1,600 | 0.0094 | ~17 Wan clips, or ~8 Seedance clips |
| **Pro** | $25 | 2,800 | 0.0089 | ~31 Wan clips, or ~15 Seedance clips |
| **Studio** | $100 | 12,500 | 0.0080 | ~138 Wan clips, or ~69 Seedance clips |

Rules:
- Monthly credits expire at cycle end. Allow rollover capped at one month's allowance (decision for the client).
- Top-up packs at the same prices as plans.
- No free plan (Starter is the entry point). Optional one-time **trial gift of ~50 credits** after email verification + Turnstile.
- Concurrent-job limits by plan: 2 / 3 / 4 / 6.
- Show the credit cost before every generation.

## Margin check

Assume a payment fee, then provider cost:

| Plan | Net revenue after fee* | Worst-case provider cost if all credits go to Seedance | Gross margin |
|---|---|---|---|
| Starter | ~$7.1–7.5 | ~$2.9 | ~60% |
| Studio | ~$94 | ~$45 | ~50% |

\* Fees are approximate: Stripe ≈ 2.9% + $0.30; merchant-of-record services (Paddle, Lemon Squeezy) ≈ 5% + $0.50; Paystack differs for local vs international cards. **Verify current fees.** Mobile in-app purchases lose 15–30% to Apple/Google.

**Main risk:** provider price drift. Seedance prices differ widely between resellers and have changed often, and avatar-style lip sync costs far more than video-to-video lip sync. Keep `models.cost_usd_micros_per_unit` current, review the margin report weekly, and reprice credits when a model's cost moves by more than about 20%.

## Rough economics (illustrative ceiling)

Assumes $16 average plan, 70% credit use, variable cost ≈ 45% of revenue.

| Paying users | Revenue/mo | Variable cost | Fixed | Left before people, marketing, support |
|---|---|---|---|---|
| 50 | ~$800 | ~$360 | ~$50 | ~$390 |
| 500 | ~$8,000 | ~$3,600 | ~$250 | ~$4,150 |

Ignores refunds, chargebacks, trials, support, and marketing.

## Fixed costs (early)

| Item | Cost |
|---|---|
| VPS | Already owned (storage upgrade soon) |
| Cloudflare Workers paid plan (likely needed) | ~$5/mo |
| R2 | Free up to 10 GB, then cheap |
| Resend, Sentry, PostHog, GitHub Actions | Free tiers first |
| Domain | ~$10–15/yr |
| Apple Developer / Google Play (Phase 7) | $99/yr / $25 once |
| Not yet priced | Legal review of terms and privacy policy |

## Credit lifecycle

1. **Grant:** a payment webhook creates a `payments` row and a `grant_plan` or `grant_topup` ledger entry in one transaction (idempotent on `provider_payment_id`).
2. **Spend:** deducted when the job is created.
3. **Refund:** automatic on failure, once per job.
4. **Expire:** a nightly job writes `expire` entries for unused monthly credits past the rollover cap.
5. **Reconcile:** nightly check that ledger sums equal balances.

## Payments

- Choose the provider based on where the client's business is registered. Stripe is not available everywhere (including Nigeria for local businesses). Alternatives: Paystack/Flutterwave for local rails, or a merchant-of-record (Paddle, Lemon Squeezy, Polar) that also handles international tax.
- Implement a `PaymentProvider` interface (`createCheckout`, `verifyWebhook`, `parseEvent`) so the provider can change.
- Always process webhooks idempotently via `webhook_events`.
- Subscription states: `active`, `past_due`, `canceled`, `expired`. On `past_due`, stop granting new credits but keep existing ones until period end.
- Refund policy: automatic credit refunds for failed jobs; cash refunds handled manually in the provider dashboard.

## Admin reports

- Margin by model: credits charged vs provider cost, last 7 and 30 days.
- Top spenders and abnormal usage.
- Failed-job rate by provider.
- Daily spend vs the global cap.

## Definition of done (Phase 5)

- [ ] Checkout creates a plan or top-up and grants credits exactly once per payment
- [ ] Replaying a webhook changes nothing
- [ ] Pricing page matches the `plans` table
- [ ] Margin report shows realistic numbers on test data
- [ ] Refund-on-failure and expiry jobs verified
