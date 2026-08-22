import type { Metadata } from "next";
import type { ReactNode } from "react";

import { PublicLegalPageShell } from "@/app/components/PublicLegalPageShell";

import {
  ContactsBody,
  PrivacyBody,
  RefundsBody,
  SubscriptionTermsBody,
  TermsBody,
} from "./LegalBodies";

export const metadata: Metadata = {
  title: { absolute: "Юридическая информация · Reset" },
  description: "Политика конфиденциальности, условия, оплата, возвраты и контакты Reset.",
};

function LegalSection({
  id,
  title,
  children,
  open = false,
}: {
  id: string;
  title: string;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details
      id={id}
      open={open}
      className="group rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
    >
      <summary className="cursor-pointer list-none py-1 text-base font-semibold text-white marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          {title}
          <span className="text-white/40 transition group-open:rotate-45" aria-hidden>
            +
          </span>
        </span>
      </summary>
      <div className="legal-prose mt-4 space-y-4 border-t border-white/[0.06] pt-4 text-[15px] leading-[1.65] text-[#C4C4CA]">
        {children}
      </div>
    </details>
  );
}

export default function LegalPage() {
  return (
    <PublicLegalPageShell
      title="Юридическая информация"
      defaultBackHref="/onboarding"
      backAriaLabel="Назад"
      backShowLabel
    >
      <p className="text-sm text-[#8C8C92]">
        Все правовые документы Reset собраны на этой странице.
      </p>

      <div className="!mt-6 space-y-3">
        <LegalSection id="privacy" title="Политика конфиденциальности" open>
          <PrivacyBody />
        </LegalSection>
        <LegalSection id="terms" title="Пользовательское соглашение">
          <TermsBody />
        </LegalSection>
        <LegalSection id="subscription" title="Условия подписки / оплаты">
          <SubscriptionTermsBody />
        </LegalSection>
        <LegalSection id="refunds" title="Возвраты">
          <RefundsBody />
        </LegalSection>
        <LegalSection id="contacts" title="Контакты">
          <ContactsBody />
        </LegalSection>
      </div>
    </PublicLegalPageShell>
  );
}
