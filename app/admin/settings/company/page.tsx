import { requireAdmin } from "@/lib/permissions";
import CompanyClient from "./company-client";

export default async function CompanySettingsPage() {
  await requireAdmin();
  return <CompanyClient />;
}

