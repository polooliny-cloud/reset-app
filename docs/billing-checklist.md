# Billing E2E Verification Checklist

Пройдите перед релизом monetization. Все проверки идут через **реальный billing lifecycle** (Supabase + ЮKassa), без localStorage premium.

## Подготовка

- [ ] `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`, `YOOKASSA_RETURN_URL`, `YOOKASSA_WEBHOOK_SECRET` заданы в env
- [ ] `SUPABASE_SERVICE_ROLE_KEY` задан (webhook + checkout DB writes)
- [ ] Webhook URL в ЮKassa: `https://<domain>/api/webhooks/yookassa?secret=<YOOKASSA_WEBHOOK_SECRET>`
- [ ] `NEXT_PUBLIC_APP_URL` указывает на публичный URL
- [ ] Миграции `0004`-`0008` применены в Supabase
- [ ] Локально: `npm run dev`, авторизованный пользователь

## 1. Checkout creation

- [ ] `/subscription` → «Оформить подписку» → modal/sheet → «Перейти к оплате»
- [ ] Редирект только на `confirmation_url` ЮKassa (HTTPS)
- [ ] В логах сервера:
  - [ ] `checkout_start`
  - [ ] `yookassa_payment_request` → `POST https://api.yookassa.ru/v3/payments`
  - [ ] `yookassa_payment_created`
  - [ ] `checkout_ready` / `checkout_pending_payment_inserted`
- [ ] Ожидаемый формат URL: HTTPS `confirmation_url` из ЮKassa
- [ ] В Supabase `payments`: строка `status = pending`, корректные `provider_invoice_id`, `metadata.plan`

## 2. Webhook (реальная оплата)

- [ ] После оплаты в ЮKassa приходит `POST /api/webhooks/yookassa`
- [ ] В логах:
  - [ ] `yookassa_env_ok`
  - [ ] `yookassa_activation_success` (userId, paymentId, plan)
  - [ ] `payment_upsert_ok`, `subscription_insert_ok`, `premium_activated`
- [ ] При неверном секрете: `yookassa_webhook_secret_invalid` → HTTP 401, premium **не** активируется

## 3. Premium activation

- [ ] `profiles.premium_until` обновлён (будущая дата)
- [ ] `subscriptions`: новая строка `status = active`, верный `plan`
- [ ] `payments.status = paid`
- [ ] UI: gate/soft-lock снимается, `/subscription` показывает «Premium активен»
- [ ] `/subscription/success` ждёт webhook и polling-ом refetch-ит premium state

## 4. Persistence

- [ ] Hard reload (F5): premium сохраняется
- [ ] Logout → Login: premium сохраняется
- [ ] В DevTools Application **нет** ключей premium/trial в localStorage как source of truth
- [ ] Только Supabase `profiles` + `subscriptions`

## 5. Error scenarios

| Сценарий | Ожидание |
|----------|----------|
| Duplicate webhook | `payment_duplicate`, premium не дублируется |
| Отмена в ЮKassa | `payment_marked_failed`, premium не выдаётся |
| Invalid webhook secret | 401, без активации |
| Истёкший premium | `isPremium: false`, soft-lock на SOS/миссиях |
| ЮKassa timeout / network | checkout 502, сообщение об ошибке в UI |
| Нет JWT на checkout | 401 Unauthorized |
| Закрыли страницу оплаты | pending payment остаётся, premium нет |

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

- `checkout_*`, `yookassa_*`
- `webhook_*`, `payment_*`, `subscription_*`, `premium_activated`
- `payment_duplicate`, `payment_marked_failed`

## Env reference

| Variable | Purpose |
|----------|---------|
| `YOOKASSA_SHOP_ID` | ID магазина |
| `YOOKASSA_SECRET_KEY` | Secret key API ЮKassa |
| `YOOKASSA_RETURN_URL` | `/subscription/success` URL |
| `YOOKASSA_WEBHOOK_SECRET` | Секрет webhook URL/header |
| `ADMIN_EMAILS` | Dev mock/status для admin (comma-separated) |
| `BILLING_DEV_ALLOW_STAGING` | `true` — dev routes на staging |
