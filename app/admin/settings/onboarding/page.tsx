import { requireAdmin } from "@/lib/permissions";
import OnboardingClient from "./onboarding-client";

export default async function OnboardingSettingsPage() {
  await requireAdmin();
  return <OnboardingClient />;
}

