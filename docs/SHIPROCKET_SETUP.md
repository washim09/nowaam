# Shiprocket Integration — Setup Guide

This document explains how to configure Shiprocket as the production shipping
provider for Nowaam.

## Prerequisites

- Active Shiprocket account: https://app.shiprocket.in
- Verified KYC + bank account in Shiprocket (required to generate live AWBs)
- A wallet balance in Shiprocket (you pay upfront; charges deducted per shipment)

## Step 1 — Create an API User

The API user is **separate** from your login account. Shiprocket requires
this for security.

1. Log in to https://app.shiprocket.in
2. Navigate to **Settings → Additional Settings → API Users**
3. Click **+ Add New API User**
4. Choose a dedicated email (e.g. `api+nowaam@yourdomain.com`)
5. Set a strong password (32+ characters, mixed case, symbols)
6. **Save the password somewhere secure — Shiprocket will not show it again**
7. Confirm the user appears with status **ACTIVE**

## Step 2 — Configure Environment Variables

Add to `.env.local` (never commit this file):

```bash
SHIPPING_PROVIDER=shiprocket
SHIPROCKET_EMAIL=api+nowaam@yourdomain.com
SHIPROCKET_PASSWORD=<the password you just set>
SHIPROCKET_WEBHOOK_TOKEN=<generate a random 48-char string>
```

Generate the webhook token with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Step 3 — Configure Webhook on Shiprocket Dashboard

1. Go to **Settings → Additional Settings → Webhooks**
2. Set **Webhook URL** to:
   ```
   https://nowaam.com/api/webhooks/courier-sync
   ```
   ⚠️ Shiprocket rejects URLs containing the keywords `shiprocket`, `kartrocket`, `sr`, or `kr` — that's why this route is named `courier-sync` rather than `shiprocket`.
   (For local testing use [ngrok](https://ngrok.com) or
   [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
   to expose your dev server.)
3. Set **Token** to the same string you put in `SHIPROCKET_WEBHOOK_TOKEN`
4. Enable these events (minimum):
   - Order Created
   - AWB Assigned
   - Picked Up
   - In Transit
   - Out for Delivery
   - Delivered
   - RTO / Returned
   - NDR / Undelivered
5. Click **Save**

Shiprocket sends a POST request with header `X-Api-Key: <your token>` on every
status change. Our handler at `app/api/webhooks/shiprocket/route.ts` validates
this token before processing.

## Step 4 — Per-Seller Pickup Address Setup

Each seller on Nowaam registers their own pickup address. The flow:

1. Seller fills out the shipping preferences form in their dashboard (TBD UI)
2. Our backend calls `POST /api/seller/shipping-preferences`
3. We call Shiprocket's `addpickup` endpoint to register the address with a
   unique nickname: `nowaam-<sellerId-suffix>`
4. We store the nickname in `SellerShippingPreferences.providerRegistrations`
5. When creating a shipment for that seller's order, we pass that nickname as
   `pickup_location` to Shiprocket

This means **no manual pickup setup** is required on the Shiprocket dashboard.

## Step 5 — Switch Provider in Production

Once everything is tested, set in your production env (Vercel/Render/etc.):

```
SHIPPING_PROVIDER=shiprocket
```

Existing EasyPost shipments will continue to use EasyPost (they retain their
own provider context via `Shipment.providerName`).

## Testing Without Wallet Balance

Shiprocket does **not** offer a sandbox environment. To test safely:

1. Keep wallet balance at the minimum (~₹500)
2. Use a real pincode pair (e.g. 110001 → 400001) for serviceability checks
3. Cancel the shipment immediately after AWB assignment to refund wallet
4. Or use `SHIPPING_PROVIDER=mock` in dev — `MockProvider` simulates all
   endpoints with fake but realistic data

## Token Caching

Shiprocket JWTs are valid for 10 days. We cache them in MongoDB
(`ProviderAuth` collection) and in process memory, refreshing 1 day before
expiry. No manual rotation needed.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `Shiprocket login failed: 401` | Wrong email/password OR using main account credentials instead of API user | Reset API user password, update `.env.local` |
| `No couriers available between X and Y` | Pincode pair not serviceable, wallet empty, or KYC pending | Verify KYC in Shiprocket dashboard, check wallet, try other pincodes |
| Webhook returns 401 | `SHIPROCKET_WEBHOOK_TOKEN` mismatch | Re-copy token from `.env.local` into Shiprocket dashboard webhook config |
| Webhook fires but shipment not updated | AWB number mismatch | Check `Shipment.awbNumber` matches what Shiprocket sent |
| `Failed to register pickup` | Nickname collision or missing required address field | Check `addpickup` API response logged in server console |

## Security Notes

- **Never** commit `.env.local` to git (already in `.gitignore`)
- **Never** share passwords in chat tools, email, or Slack
- Rotate `SHIPROCKET_WEBHOOK_TOKEN` and API user password quarterly
- Set up IP allowlist on Shiprocket if available (Enterprise plan)
- Monitor `/api/webhooks/shiprocket` errors via Sentry/Datadog in production
