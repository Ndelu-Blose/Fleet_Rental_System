import { requireAdmin } from "@/lib/permissions";
import SystemClient from "./system-client";

export default async function SystemSettingsPage() {
  await requireAdmin();
  return <SystemClient />;
}

