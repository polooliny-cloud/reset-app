import { LegalPageShell } from "@/app/components/premium/LegalPageShell";

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p>
        Reset обрабатывает данные аккаунта и прогресса, необходимые для работы приложения: email,
        статистику streak, XP и события онбординга.
      </p>
      <p>
        Мы не продаём персональные данные третьим лицам. Данные хранятся на защищённой инфраструктуре
        Supabase с доступом по вашему аккаунту.
      </p>
      <p>
        Вы можете запросить удаление аккаунта и связанных данных, обратившись в поддержку сервиса.
      </p>
      <p className="text-xs text-[#8C8C92]">Последнее обновление: май 2026</p>
    </LegalPageShell>
  );
}
