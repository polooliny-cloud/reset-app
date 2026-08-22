import type { Metadata } from "next";

import { PublicLegalPageShell } from "@/app/components/PublicLegalPageShell";
import { ContactsBody } from "@/app/legal/LegalBodies";

export const metadata: Metadata = {
  title: { absolute: "Контакты · Reset" },
  description: "Контактная информация и реквизиты сервиса Reset.",
};

export default function ContactsPage() {
  return (
    <PublicLegalPageShell title="Контакты · Reset">
      <ContactsBody />
    </PublicLegalPageShell>
  );
}
