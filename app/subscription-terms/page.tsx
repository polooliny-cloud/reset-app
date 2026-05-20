import { LegalPageShell } from "@/app/components/premium/LegalPageShell";

export default function SubscriptionTermsPage() {
  return (
    <LegalPageShell title="Subscription Terms">
      <p>
        Пробный период Reset+ длится 3 дня и активируется один раз на аккаунт. Списание не
        происходит автоматически при активации trial.
      </p>
      <p>
        Платная подписка оформляется через платёжный сервис Lava. Срок действия и стоимость
        отображаются перед оплатой на экране подписки.
      </p>
      <p>
        Возвраты и отмена регулируются правилами платёжного провайдера и применимым законодательством.
        Статус подписки синхронизируется после подтверждения оплаты.
      </p>
      <p className="text-xs text-[#8C8C92]">Последнее обновление: май 2026</p>
    </LegalPageShell>
  );
}
