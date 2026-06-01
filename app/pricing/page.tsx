import type { Metadata } from "next";

import {
  LegalEmailOnly,
  LegalH2,
  LegalH3,
  LegalList,
  PublicLegalPageShell,
} from "@/app/components/PublicLegalPageShell";

export const metadata: Metadata = {
  title: { absolute: "Тарифы · Reset" },
  description: "Тарифы Reset+ и условия доступа к premium-функциям.",
};

export default function PricingPage() {
  return (
    <PublicLegalPageShell title="Тарифы · Reset">
      <LegalH2>Доступ к premium-функциям</LegalH2>

      <LegalH3>Тарифы</LegalH3>
      <LegalList items={["30 дней доступа: 299 ₽", "365 дней доступа: 1990 ₽"]} />

      <LegalH3>Trial</LegalH3>
      <p>3 дня бесплатно.</p>
      <p>Trial активируется один раз на аккаунт.</p>

      <LegalH3>Важно</LegalH3>
      <p>Автоматические списания НЕ используются.</p>
      <p>Каждая оплата выполняется вручную пользователем.</p>
      <p>После оплаты premium-доступ активируется автоматически.</p>
      <p>
        После окончания оплаченного периода premium-доступ ограничивается до следующей оплаты.
      </p>

      <LegalH2>Контакты</LegalH2>
      <LegalEmailOnly />
    </PublicLegalPageShell>
  );
}
