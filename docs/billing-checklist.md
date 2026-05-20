# Billing E2E Verification Checklist

Пройдите перед релизом monetization. Все проверки идут через **реальный billing lifecycle** (Supabase + Lava), без localStorage premium.

## Подготовка

- [ ] `LAVA_API_KEY`, `LAVA_SHOP_ID`, `LAVA_WEBHOOK_SECRET` заданы в env
- [ ] `SUPABASE_SERVICE_ROLE_KEY` задан (webhook + checkout DB writes)
- [ ] Webhook URL в Lava: `https://<domain>/api/webhooks/lava`
- [ ] `NEXT_PUBLIC_APP_URL` указывает на публичный URL (для success/fail redirect)
- [ ] Миграции `0004`, `0005` применены в Supabase
- [ ] Локально: `npm run dev`, авторизованный пользователь

## Dev tools (локально)

- [ ] Панель **Billing debug** (правый нижний угол) открывается
- [ ] `GET /api/dev/billing/status` возвращает profile, payments, subscriptions, premiumState
- [ ] `POST /api/dev/billing/mock-success` активирует premium через `handleLavaWebhook` → `activatePaidSubscription`
- [ ] После mock: `premiumState.isPremium === true`, в логах `[billing] premium_activated`

## 1. Checkout creation

- [ ] `/subscription` → «Оформить подписку» → редирект на Lava (`checkout_url`)
- [ ] Редирект только через `window.location.href` (не `window.open`)
- [ ] Debug перед редиректом: `/subscription?checkout_debug=1` или `NEXT_PUBLIC_CHECKOUT_DEBUG=1` (в dev включено по умолчанию)
- [ ] В логах сервера:
  - [ ] `checkout_start` (shopId, hookUrl, successUrl, failUrl)
  - [ ] `lava_invoice_request` → `POST https://api.lava.ru/business/invoice/create`
  - [ ] `checkout_response_raw` — полный JSON от Lava (`data.url`, `data.id`, `status_check`, `status`)
  - [ ] `lava_invoice_success` (`checkoutUrl`, `resolvedFrom`: `data.url` или `canonical_pay_lava_ru`)
  - [ ] `checkout_ready` / `checkout_pending_payment_inserted`
- [ ] Ожидаемый формат URL: `https://pay.lava.ru/invoice/{invoice_uuid}`
- [ ] Если `data.url` пустой — fallback на canonical `pay.lava.ru`; если URL нет совсем → HTTP 500 `checkout_url_missing`
- [ ] В Supabase `payments`: строка `status = pending`, корректные `provider_invoice_id`, `metadata.plan`

## 2. Webhook (реальная оплата)

- [ ] После оплаты в Lava приходит `POST /api/webhooks/lava`
- [ ] В логах:
  - [ ] `webhook_received`
  - [ ] `webhook_signature_valid`
  - [ ] `webhook_activation_start` (userId, invoiceId, plan)
  - [ ] `payment_upsert_ok`, `subscription_insert_ok`, `premium_activated`
- [ ] При неверном секрете: `webhook_signature_invalid` → HTTP 401, premium **не** активируется

## 3. Premium activation

- [ ] `profiles.premium_until` обновлён (будущая дата)
- [ ] `subscriptions`: новая строка `status = active`, верный `plan`
- [ ] `payments.status = paid`
- [ ] UI: gate/soft-lock снимается, `/subscription` показывает «Premium активен»
- [ ] `PremiumProvider` после `?billing=success` делает refetch

## 4. Persistence

- [ ] Hard reload (F5): premium сохраняется
- [ ] Logout → Login: premium сохраняется
- [ ] В DevTools Application **нет** ключей premium/trial в localStorage как source of truth
- [ ] Только Supabase `profiles` + `subscriptions`

## 5. Error scenarios

| Сценарий | Ожидание |
|----------|----------|
| Duplicate webhook | `payment_duplicate`, premium не дублируется |
| Отмена / expire в Lava | `payment_marked_failed`, premium не выдаётся |
| Invalid webhook secret | 401, без активации |
| Истёкший premium | `isPremium: false`, soft-lock на SOS/миссиях |
| Lava timeout / network | checkout 502, сообщение об ошибке в UI |
| Нет JWT на checkout | 401 Unauthorized |
| Закрыли страницу оплаты | `?billing=cancelled`, pending payment остаётся, premium нет |

## 6. Trial flow

- [ ] Онбординг «Начать 3 дня бесплатно» → trial в DB, app открывается
- [ ] Повторный trial → API 409 `trial_already_used`
- [ ] После окончания trial: soft-lock, subscription screen доступен

## 7. Production smoke (staging)

- [ ] Реальная оплата минимального тарифа (monthly 299 ₽)
- [ ] Webhook доходит на staging URL (ngrok / deploy preview)
- [ ] Полный цикл: checkout → pay → return → premium → reload → re-login

## Логи для мониторинга

Искать в server logs префикс `[billing]` (JSON lines):

- `checkout_*`, `lava_invoice_*`
- `webhook_*`, `payment_*`, `subscription_*`, `premium_activated`
- `payment_duplicate`, `payment_marked_failed`

## Env reference

| Variable | Purpose |
|----------|---------|
| `LAVA_API_KEY` | Подпись invoice API |
| `LAVA_SHOP_ID` | ID магазина |
| `LAVA_WEBHOOK_SECRET` | Проверка Authorization webhook |
| `LAVA_HOOK_URL` | Override webhook URL (optional) |
| `ADMIN_EMAILS` | Dev mock/status для admin (comma-separated) |
| `BILLING_DEV_ALLOW_STAGING` | `true` — dev routes на staging |
