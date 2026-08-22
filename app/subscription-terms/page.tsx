import { LegalPageShell } from "@/app/components/premium/LegalPageShell";
import { SubscriptionTermsBody } from "@/app/legal/LegalBodies";

export default function SubscriptionTermsPage() {
  return (
    <LegalPageShell title="Subscription Terms">
      <SubscriptionTermsBody />
    </LegalPageShell>
  );
}
