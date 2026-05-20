import { LegalPageShell } from "@/app/components/premium/LegalPageShell";

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p>
        Используя Reset, вы соглашаетесь применять приложение как инструмент самоконтроля и не
        рассматривать его как медицинскую или терапевтическую услугу.
      </p>
      <p>
        Вы несёте ответственность за сохранность доступа к аккаунту и достоверность вводимых данных.
      </p>
      <p>
        Мы можем обновлять функциональность приложения. Продолжение использования после обновлений
        означает принятие актуальных условий.
      </p>
      <p className="text-xs text-[#8C8C92]">Последнее обновление: май 2026</p>
    </LegalPageShell>
  );
}
