---
name: Onboarding payment gate
description: How the post-approval payment confirmation gate is scoped (dashboard vs storefront)
---

# Onboarding payment gate

`Store.paymentConfirmed` (default true; set false on shop-request approval) gates the
**public storefront only**, NOT the owner dashboard.

**Why:** The owner must reach the full dashboard to attach their bank-transfer receipt
(via the Messages billing-attachment flow). The platform admin then reviews the
attachment and clicks "Confirm first payment" (Stores.tsx) which flips
`paymentConfirmed:true` and brings the storefront online. An earlier full-screen
blocking gate over the dashboard was explicitly rejected by the user.

**How to apply:**
- Owner dashboard always renders `<Outlet>`. A non-blocking `PaymentPendingBanner`
  (Admin.tsx) shows for owners only when `!paymentConfirmed`, linking to Messages.
- EVERY public storefront endpoint must filter `status:'ACTIVE', paymentConfirmed:true`
  — not just the store list/detail. Products, orders, and analytics endpoints in
  storefront.routes.ts are easy to miss and will leak/accept data otherwise.
