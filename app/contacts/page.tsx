import type { Metadata } from "next";

import {
  LegalEmailLink,
  LegalRequisitesBlock,
  PublicLegalPageShell,
} from "@/app/components/PublicLegalPageShell";

export const metadata: Metadata = {
  title: { absolute: "Контакты · Reset" },
  description: "Контактная информация и реквизиты сервиса Reset.",
};

export default function ContactsPage() {
  return (
    <PublicLegalPageShell title="Контакты · Reset">
      <p>
        Email:
        <br />
        <LegalEmailLink />
      </p>
      <LegalRequisitesBlock />
    </PublicLegalPageShell>
  );
}
