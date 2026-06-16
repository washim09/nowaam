# Production Monitoring

## Built-in
- Structured JSON logger (`lib/logger.ts`)
- Health endpoint: `GET /api/health`
- Logger wired into webhook, cron, auto-create-shipments
- Sentry-ready (forwards errors if installed + DSN set)

## Setup Steps

### 1. Uptime (BetterStack — free)
1. Sign up at https://betterstack.com
2. New Monitor → HTTPS → `https://nowaam.com/api/health`, 60s interval
3. Add email alerts

### 2. Sentry (optional)
```
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```
Add `SENTRY_DSN=...` to `.env.local` + Vercel. Done — `logger.error()` calls auto-forward.

### 3. Log Drains (Vercel Pro)
Settings → Log Drains → add Datadog/Logtail/Axiom.

## Key Log Events
- `webhook.unauthorized` (warn) — token mismatch
- `webhook.shipment_not_found` (warn) — AWB not in DB
- `webhook.error` (error) — investigate
- `cron.completed` (info) — normal
- `cron.time_budget_exceeded` (warn) — bump batch
- `cron.fatal` (error) — investigate
- `auto_shipment.completed` (info) — per-order summary
- `auto_shipment.seller_failure` (warn) — seller config issue
- `auto_shipment.fatal` (error) — investigate

## Log Format
```json
{"ts":"2025-...","level":"info","event":"webhook.processed","app":"nowaam","route":"webhooks/courier-sync","requestId":"...","awb":"...","newStatus":"delivered"}
```
