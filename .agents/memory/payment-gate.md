---
name: Onboarding payment gate
description: How the post-approval payment-confirmation gate is scoped (dashboard vs storefront)
---

# Onboarding payment gate

`Store.paymentConfirmed` (default true; set false on shop-request approval) gates the
**public storefront only**, NOT the owner dashboard.

**Why:** The user explicitly rejected any full-screen lockout of the dashboard. The
owner must reach the full dashboard to attach their bank-transfer bill; the platform
admin then reviews it and confirms the first payment, which brings the storefront online.

**How to apply:**
- Owner dashboard always renders normally. A non-blocking card shown only to owners
  while `!paymentConfirmed` lets them upload the bill inline; the bill is stored
  directly on the Store record (a receipt URL + note), it does NOT auto-activate.
- Admin reviews the attached bill in the platform store-detail view and clicks confirm,
  which is the only thing that flips `paymentConfirmed:true`.
- EVERY public storefront endpoint must filter `paymentConfirmed:true` (plus
  `status:'ACTIVE'` where relevant) — list, slug-detail, products, orders, analytics.
  These are easy to miss individually and each one leaks/accepts data otherwise.
  Exception: slug-detail intentionally still returns confirmed-but-suspended stores so
  their offline page renders.
- Receipt URL/note must be stripped from the public-store serializer so they never leak.
