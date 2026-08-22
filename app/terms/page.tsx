import type { Metadata } from "next";

import { PublicLegalPageShell } from "@/app/components/PublicLegalPageShell";
import { TermsBody } from "@/app/legal/LegalBodies";

export const metadata: Metadata = {
  title: { absolute: "Условия использования · Reset" },
  description: "Условия использования приложения Reset.",
};

export default function TermsPage() {
  return (
    <PublicLegalPageShell title="Условия использования · Reset">
      <TermsBody />
    </PublicLegalPageShell>
  );
}
