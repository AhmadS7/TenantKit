---
name: stripe-debug
description: Replay a Stripe webhook against the local TenantKit backend. Detects sandbox vs live mode, points at the Stripe CLI listener, and generates sample event payloads. Trigger: "replay stripe webhook", "test billing flow", "stripe sandbox", "trigger invoice.paid locally".
---

# /stripe-debug

Replay or simulate a Stripe webhook hitting the local TenantKit backend.

## When to use

- The user is testing the billing flow end-to-end
- The user wants to verify a webhook handler change without going through the full Stripe UI
- The user is debugging a webhook that isn't firing
- The user asks "how do I trigger a `customer.subscription.updated` event locally?"

## Procedure

1. **Detect the mode.** Read `STRIPE_API_KEY` from the user's environment (or the repo's `.env`).
   - If unset, `change_me`, or empty → **mock sandbox mode**. The handler skips signature verification. Suggest the user hit the endpoint directly with `curl` and a hand-rolled payload.
   - If it starts with `sk_test_` → **test mode**. Use the Stripe CLI listener.
   - If it starts with `sk_live_` → **live mode**. Warn the user they are pointing at production and refuse to replay.
2. **For test mode:**
   - Confirm the user has the [Stripe CLI](https://stripe.com/docs/stripe-cli) installed (`stripe --version`).
   - Tell the user to run, in a separate terminal:
     ```bash
     stripe login --project-name tenantkit
     stripe listen --forward-to http://localhost:3000/v1/billing/webhook
     ```
     (Use the `v1/` prefix or drop it based on the actual route — check [src/billing/billing.controller.ts](../../../src/billing/billing.controller.ts).)
   - The CLI prints a `whsec_…` signing secret. Set it as `STRIPE_WEBHOOK_SECRET` in the user's shell, **not** in `.env` (which is gitignored and the CLI secret rotates per session).
3. **For test mode + a specific event type** (e.g. `invoice.paid`):
   - Use the Stripe CLI to trigger a real event:
     ```bash
     stripe trigger invoice.paid
     ```
   - Or, for an event against a real test customer/subscription:
     ```bash
     stripe events resend evt_1ABC...
     ```
   - Note: `stripe trigger` uses Stripe's own demo data, not the user's data. For real-data replay, find the event in the [Stripe Dashboard](https://dashboard.stripe.com/test/events) and use "Resend webhook".
4. **For mock sandbox mode:**
   - Generate a sample payload in JSON and POST it directly. See the example below.
   - The handler should accept the payload, log "mock mode" or similar, and write to the DB.
5. **Verify the result.**
   - Tail the backend logs: `pnpm run start:dev | grep -i stripe`
   - Check the subscription record in the DB: the relevant table is `tenants.subscription` (or whatever the schema names it — search `subscription` in the migrations).
   - Re-run `/rls-audit` if the change touched a billing table.

## Example payload (mock sandbox mode)

```json
{
  "id": "evt_test_001",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_test_001",
      "customer": "cus_test_001",
      "status": "active",
      "items": {
        "data": [
          { "price": { "id": "price_pro_test" } }
        ]
      }
    }
  }
}
```

```bash
curl -X POST http://localhost:3000/v1/billing/webhook \
  -H 'Content-Type: application/json' \
  -d @payload.json
```

## Reference files

- [src/billing/billing.controller.ts](../../../src/billing/billing.controller.ts) — webhook entry + raw-body
- [src/billing/billing.service.ts](../../../src/billing/billing.service.ts) — event handler
- [src/main.ts](../../../src/main.ts) — body parser order (raw before json)
- [src/config/env.validation.ts](../../../src/config/env.validation.ts) — env keys
- [src/app.module.ts](../../../src/app.module.ts) lines 122-123 — billing/webhook route exclusion from TenantMiddleware

## Boundaries

- Never replay against `sk_live_*` keys. If the user has a live key in `.env`, tell them to switch to test mode first.
- Never write a real customer/subscription ID into a mock payload — use `*_test_*` placeholders.
- Do not edit the webhook signature verification path. The mock-mode bypass is in the handler, and it must remain gated on `STRIPE_API_KEY === 'change_me'`.
