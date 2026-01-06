import { requireAdmin } from "@/lib/permissions";
import ContractsClient from "./contracts-client";

export default async function ContractsSettingsPage() {
  await requireAdmin();
  return <ContractsClient />;
}

