import type { Metadata } from "next";

import { PublicLegalPageShell } from "@/app/components/PublicLegalPageShell";
import { RefundsBody } from "@/app/legal/LegalBodies";

export const metadata: Metadata = {
  title: { absolute: "Возврат средств · Reset" },
  description: "Политика возврата средств приложения Reset.",
};

export default function RefundsPage() {
  return (
    <PublicLegalPageShell title="Возврат средств · Reset">
      <RefundsBody />
    </PublicLegalPageShell>
  );
}
