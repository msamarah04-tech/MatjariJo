import type { Order, OrderItem, Store, User } from '@prisma/client';
import { prisma } from '../db.js';
import { env } from '../env.js';
import { logger } from '../logger.js';
import { formatMoney } from '../../shared/money.js';
import { PLAN_DEFS, TRIAL_DAYS } from '../../shared/plans.js';
import type { StorePlan } from '../../shared/contract.js';
import { sendMail } from './mail.js';

type OrderWithItems = Order & { items: OrderItem[] };

/** Public storefront URL: subdomain when PUBLIC_BASE_DOMAIN is set, else path on the app origin. */
export function storefrontLink(slug: string): string {
  if (env.PUBLIC_BASE_DOMAIN) return `https://${slug}.${env.PUBLIC_BASE_DOMAIN}/`;
  const origin = env.FRONTEND_ORIGIN.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${origin}/#/s/${slug}`;
}

const wrap = (title: string, body: string) => `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917">
    <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
    ${body}
    <p style="margin-top:32px;font-size:12px;color:#a8a29e">Powered by Matjari</p>
  </div>`;

const money = (cents: number, currency: string) => formatMoney(cents, currency);

function orderLinesHtml(order: OrderWithItems): string {
  const rows = order.items
    .map((item) => `<tr>
      <td style="padding:6px 0;border-bottom:1px solid #f5f5f4">${item.productNameSnapshot}${item.variantTitleSnapshot ? ` · ${item.variantTitleSnapshot}` : ''}</td>
      <td style="padding:6px 0;border-bottom:1px solid #f5f5f4;text-align:right">×${item.quantity}</td>
      <td style="padding:6px 0;border-bottom:1px solid #f5f5f4;text-align:right">${money(item.lineTotalCents, order.currency)}</td>
    </tr>`)
    .join('');
  return `<table style="width:100%;border-collapse:collapse;font-size:14px">${rows}
    <tr><td colspan="2" style="padding:10px 0 0;font-weight:700">Total (Cash on Delivery)</td>
    <td style="padding:10px 0 0;text-align:right;font-weight:700">${money(order.totalCents, order.currency)}</td></tr></table>`;
}

/** Order placed: confirmation to the customer (when an email was given) + alert to the store owner. */
export function notifyOrderPlaced(store: Store, order: OrderWithItems): void {
  if (order.customerEmail) {
    sendMail({
      to: order.customerEmail,
      subject: `Order confirmed — ${store.name}`,
      html: wrap(`Thanks for your order, ${order.customerName}!`, `
        <p style="font-size:14px;line-height:1.6">Your Cash on Delivery order at <strong>${store.name}</strong> is confirmed. Reference: <code>${order.id}</code></p>
        ${orderLinesHtml(order)}
        <p style="font-size:14px;line-height:1.6;margin-top:16px">Delivery to: ${order.shippingAddress || 'address on file'}</p>`),
    });
  }
  // Owner alert is looked up asynchronously; failures only log.
  prisma.user.findUnique({ where: { id: store.ownerId }, select: { email: true } })
    .then((owner) => {
      if (!owner?.email) return;
      sendMail({
        to: owner.email,
        subject: `New order at ${store.name} — ${money(order.totalCents, order.currency)}`,
        html: wrap('You have a new order', `
          <p style="font-size:14px;line-height:1.6"><strong>${order.customerName}</strong> (${order.customerPhone || 'no phone'}) placed a COD order. Reference: <code>${order.id}</code></p>
          ${orderLinesHtml(order)}
          <p style="font-size:14px;line-height:1.6;margin-top:16px">Review and approve it from your admin dashboard.</p>`),
      });
    })
    .catch((error) => logger.error({ err: error, storeId: store.id }, 'Owner order alert lookup failed'));
}

/** Shop request approved: welcome the owner with their storefront link and trial window. */
export function notifyShopApproved(store: Store, owner: User): void {
  const link = storefrontLink(store.slug);
  sendMail({
    to: owner.email,
    subject: `${store.name} is live on Matjari 🎉`,
    html: wrap(`Welcome aboard, ${owner.name || owner.username || ''}!`, `
      <p style="font-size:14px;line-height:1.6">Your store <strong>${store.name}</strong> was approved and is now live at
      <a href="${link}">${link.replace(/^https?:\/\//, '')}</a>.</p>
      <p style="font-size:14px;line-height:1.6">Your <strong>${store.plan}</strong> plan starts with a free ${TRIAL_DAYS}-day trial${store.planPaidUntil ? ` (ends ${store.planPaidUntil.toLocaleDateString()})` : ''}. After that it is JOD ${PLAN_DEFS[store.plan as StorePlan]?.priceMonthlyJod ?? ''}/month, paid by CliQ or bank transfer.</p>
      <p style="font-size:14px;line-height:1.6">Sign in with the username you chose to add products, set your theme, and start selling.</p>`),
  });
}

/** Manual subscription payment recorded: receipt with the new paid-until date. */
export function notifyPlanPayment(store: Store): void {
  prisma.user.findUnique({ where: { id: store.ownerId }, select: { email: true, name: true } })
    .then((owner) => {
      if (!owner?.email) return;
      sendMail({
        to: owner.email,
        subject: `Payment received — ${store.name}`,
        html: wrap('Subscription payment received', `
          <p style="font-size:14px;line-height:1.6">We recorded your payment for the <strong>${store.plan}</strong> plan (JOD ${PLAN_DEFS[store.plan as StorePlan]?.priceMonthlyJod ?? ''}/month).</p>
          <p style="font-size:14px;line-height:1.6">Your store <strong>${store.name}</strong> is paid until <strong>${store.planPaidUntil ? store.planPaidUntil.toLocaleDateString() : '—'}</strong>.</p>`),
      });
    })
    .catch((error) => logger.error({ err: error, storeId: store.id }, 'Plan payment receipt lookup failed'));
}
