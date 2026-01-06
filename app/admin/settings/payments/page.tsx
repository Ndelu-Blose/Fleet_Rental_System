import { requireAdmin } from "@/lib/permissions";
import PaymentsClient from "./payments-client";

export default async function PaymentsSettingsPage() {
  await requireAdmin();
  return <PaymentsClient />;
}
