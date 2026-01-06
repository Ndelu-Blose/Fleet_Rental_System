import { requireAdmin } from "@/lib/permissions";
import NotificationsClient from "./notifications-client";

export default async function NotificationsSettingsPage() {
  await requireAdmin();

  const resendConfigured = Boolean(process.env.RESEND_API_KEY);

  return <NotificationsClient resendConfigured={resendConfigured} />;
}

