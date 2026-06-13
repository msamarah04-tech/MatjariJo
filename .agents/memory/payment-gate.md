---
name: Onboarding payment gate
description: How the request-time account creation + blocking payment-proof gate works
---

# Onboarding payment gate (request-time model)

Account + store are created **at shop-request time**, not at approval time. The public
request form creates, in one transaction: a user (`ownerStatus=RESTRICTED`), an offline
store (`paymentConfirmed=false`), and a `ShopRequest` (`status=PENDING`). The owner then
signs in to a **full-screen blocking dashboard gate** whose only action is uploading a
payment-proof image. The platform owner reviews the proof and approves (idempotent),
which unlocks the owner (`RESTRICTED→ACTIVE`) and brings the store online
(`paymentConfirmed=true`). Reject keeps the store offline with a reason and allows resubmit.

**Why:** Replaced the earlier non-blocking model (a dashboard card + receipt URL/note on
the Store record). The product now wants owners gated out of the dashboard entirely until
their first payment is approved, and the proof image lives on the ShopRequest, not the Store.

**How to apply:**
- Proof image is a data-URL stored on `ShopRequest` (`paymentProofDataUrl` Text, plus
  `paymentProofMime`, `paymentProofSize`, `paymentProofUploadedAt`). The Store no longer has
  `paymentReceiptUrl`/`paymentReceiptNote` — those columns/fields were removed.
- Upload route: `POST /api/admin/stores/:storeId/payment-proof` (and `GET` to read it back).
  Access is allowlisted for RESTRICTED owners via `requireStoreAccessForPaymentProof`
  (`assertStoreAccessForPaymentProof` allows ACTIVE|RESTRICTED). Server re-validates mime
  (jpeg/png/webp) + size (3MB) and flips PENDING→IN_REVIEW; REJECTED allows resubmit.
- Frontend gate is `OnboardingGate` in `src/routes/admin/Admin.tsx`, rendered from
  `AdminShell` when `!isPlatformViewer && !store.paymentConfirmed` (returns early, before
  the dashboard layout). It polls `getPaymentProof` + `refreshStores` every 8s so the gate
  disappears the moment the platform approves.
- Platform review: `ShopRequests` list shows `hasPaymentProof`; the detail drawer fetches
  the full data-URL via `GET /platform/shop-requests/:id` (only the detail payload carries
  `paymentProofDataUrl`, never the list). Approve/reject live on the Shop requests page;
  the old per-store "confirm payment" action + `confirm-payment` route were removed.
- EVERY public storefront endpoint must still filter `paymentConfirmed:true` (+ `status:'ACTIVE'`
  where relevant) — list, slug-detail, products, orders, analytics. Each one leaks/accepts
  data otherwise. Exception: slug-detail still returns confirmed-but-suspended stores so the
  offline page renders.
