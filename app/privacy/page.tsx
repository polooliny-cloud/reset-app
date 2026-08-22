import type { Metadata } from "next";

import { PublicLegalPageShell } from "@/app/components/PublicLegalPageShell";
import { PrivacyBody } from "@/app/legal/LegalBodies";

export const metadata: Metadata = {
  title: { absolute: "Политика конфиденциальности · Reset" },
  description: "Политика конфиденциальности приложения Reset.",
};

export default function PrivacyPage() {
  return (
    <PublicLegalPageShell title="Политика конфиденциальности · Reset">
      <PrivacyBody />
    </PublicLegalPageShell>
  );
}
