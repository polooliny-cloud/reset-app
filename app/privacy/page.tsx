import type { Metadata } from "next";

import {
  LegalEmailOnly,
  LegalH2,
  LegalH3,
  LegalList,
  PublicLegalPageShell,
} from "@/app/components/PublicLegalPageShell";

export const metadata: Metadata = {
  title: { absolute: "Политика конфиденциальности · Reset" },
  description: "Политика конфиденциальности приложения Reset.",
};

export default function PrivacyPage() {
  return (
    <PublicLegalPageShell title="Политика конфиденциальности · Reset">
      <p className="text-sm text-[#8C8C92]">Последнее обновление: май 2026</p>

      <LegalH2>1. Общие положения</LegalH2>
      <p>
        Настоящая Политика конфиденциальности описывает, какие данные собирает сервис Reset, как
        они используются и хранятся.
      </p>
      <p>Используя Reset, вы соглашаетесь с условиями данной Политики.</p>
      <p>
        Reset: digital-сервис для самоконтроля, отслеживания прогресса и формирования привычек.
        Сервис не является медицинской, психологической или терапевтической услугой.
      </p>

      <LegalH2>2. Какие данные мы собираем</LegalH2>
      <LegalH3>Данные аккаунта</LegalH3>
      <LegalList items={["email", "дата регистрации", "дата последнего входа"]} />
      <LegalH3>Данные прогресса</LegalH3>
      <LegalList
        items={[
          "streak",
          "XP",
          "уровень",
          "победы",
          "started_at",
          "premium_until",
          "trial_started_at",
        ]}
      />
      <LegalH3>Технические данные</LegalH3>
      <LegalList
        items={[
          "IP-адрес",
          "данные браузера и устройства",
          "системные логи",
          "данные аналитики",
        ]}
      />

      <LegalH2>3. Как используются данные</LegalH2>
      <p>Данные используются для:</p>
      <LegalList
        items={[
          "работы приложения",
          "синхронизации прогресса",
          "отображения статистики",
          "работы Reset+",
          "улучшения стабильности сервиса",
          "предотвращения злоупотреблений",
        ]}
      />
      <p>Мы не продаём персональные данные третьим лицам.</p>

      <LegalH2>4. Сторонние сервисы</LegalH2>
      <p>Reset использует:</p>
      <LegalList items={["Supabase", "PostHog", "TeamWeb VPS", "ЮKassa"]} />

      <LegalH2>5. Оплата</LegalH2>
      <p>Платежи обрабатываются через ЮKassa.</p>
      <p>Reset не хранит данные банковских карт пользователей.</p>

      <LegalH2>6. Хранение данных</LegalH2>
      <p>Данные хранятся до удаления аккаунта пользователем либо запроса на удаление.</p>

      <LegalH2>7. Удаление аккаунта</LegalH2>
      <p>Пользователь может запросить удаление аккаунта через поддержку.</p>

      <LegalH2>8. Возрастные ограничения</LegalH2>
      <p>Использование Reset разрешено только лицам старше 18 лет.</p>

      <LegalH2>9. Контакты</LegalH2>
      <LegalEmailOnly />
    </PublicLegalPageShell>
  );
}
