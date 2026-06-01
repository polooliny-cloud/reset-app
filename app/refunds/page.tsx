import type { Metadata } from "next";

import {
  LegalEmailLink,
  LegalEmailOnly,
  LegalH2,
  LegalList,
  PublicLegalPageShell,
} from "@/app/components/PublicLegalPageShell";

export const metadata: Metadata = {
  title: { absolute: "Возврат средств · Reset" },
  description: "Политика возврата средств приложения Reset.",
};

export default function RefundsPage() {
  return (
    <PublicLegalPageShell title="Возврат средств · Reset">
      <p className="text-sm text-[#8C8C92]">Последнее обновление: май 2026</p>

      <LegalH2>1. Общие положения</LegalH2>
      <p>Reset предоставляет digital-доступ к premium-функциям приложения Reset+.</p>

      <LegalH2>2. Возврат средств</LegalH2>
      <p>Пользователь может запросить возврат средств в течение 24 часов с момента оплаты.</p>
      <p>Возврат возможен при:</p>
      <LegalList
        items={[
          "отсутствии злоупотреблений",
          "отсутствии мошеннических действий",
          "соблюдении правил сервиса",
        ]}
      />

      <LegalH2>3. Как запросить возврат</LegalH2>
      <p>Для возврата необходимо написать на:</p>
      <p>
        <LegalEmailLink />
      </p>
      <p>Запрос должен быть отправлен с email аккаунта.</p>

      <LegalH2>4. Срок обработки</LegalH2>
      <p>Запросы рассматриваются в течение 7 рабочих дней.</p>

      <LegalH2>5. Контакты</LegalH2>
      <LegalEmailOnly />
    </PublicLegalPageShell>
  );
}
