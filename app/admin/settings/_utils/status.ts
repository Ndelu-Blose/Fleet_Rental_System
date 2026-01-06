export function getCompanyStatus(form: Record<string, string>): boolean {
  const name = (form["company.name"] ?? "").trim();
  const phone = (form["company.phone"] ?? "").trim();
  const whatsapp = (form["company.whatsapp"] ?? "").trim();
  const address = (form["company.address"] ?? "").trim();

  // Basic company info
  const basicInfo = Boolean(name && (phone || whatsapp) && address);

  // Banking details (optional but recommended)
  const bankName = (form["company.bank.name"] ?? "").trim();
  const accountHolder = (form["company.bank.accountHolder"] ?? "").trim();
  const accountNumber = (form["company.bank.accountNumber"] ?? "").trim();
  const branchCode = (form["company.bank.branchCode"] ?? "").trim();
  const accountType = (form["company.bank.accountType"] ?? "").trim();
  const bankingConfigured = Boolean(
    bankName && accountHolder && accountNumber && branchCode && accountType
  );

  // Company is configured if basic info is complete
  // Banking is separate status shown in UI
  return basicInfo;
}

export function getBankingStatus(form: Record<string, string>): boolean {
  const bankName = (form["company.bank.name"] ?? "").trim();
  const accountHolder = (form["company.bank.accountHolder"] ?? "").trim();
  const accountNumber = (form["company.bank.accountNumber"] ?? "").trim();
  const branchCode = (form["company.bank.branchCode"] ?? "").trim();
  const accountType = (form["company.bank.accountType"] ?? "").trim();

  return Boolean(bankName && accountHolder && accountNumber && branchCode && accountType);
}

export function getPaymentsStatus(form: Record<string, string>): boolean {
  const mode = (form["payments.mode"] ?? "").trim();
  // Check both possible keys for grace days (legacy vs new)
  const graceDays = form["payments.gracePeriodDays"] ?? form["payments.graceDays"] ?? "";
  const graceDaysNum = Number(graceDays);

  return Boolean(mode && Number.isFinite(graceDaysNum) && graceDaysNum >= 0);
}

export function getNotificationsStatus(form: Record<string, string>): boolean {
  const enabled = (form["notifications.enabled"] ?? "false") === "true";
  const fromEmail = (form["notifications.fromEmail"] ?? "").trim();

  // If disabled, it's "configured" (no action needed)
  // If enabled, must have fromEmail
  return !enabled || Boolean(fromEmail);
}

export function getContractsStatus(form: Record<string, string>): boolean {
  const carAmount = form["contracts.default.carAmount"] ?? "0";
  const bikeAmount = form["contracts.default.bikeAmount"] ?? "0";
  const carNum = Number(carAmount);
  const bikeNum = Number(bikeAmount);

  // At least one default amount should be set
  return (Number.isFinite(carNum) && carNum > 0) || (Number.isFinite(bikeNum) && bikeNum > 0);
}

export function getOnboardingStatus(form: Record<string, string>): boolean {
  const requiredFields = form["onboarding.requiredFields"] ?? "";
  if (!requiredFields) return false;

  try {
    const fields = JSON.parse(requiredFields);
    return Array.isArray(fields) && fields.length > 0;
  } catch {
    return false;
  }
}

export function getSystemStatus(form: Record<string, string>): boolean {
  // System is always "configured" since it's just maintenance mode toggle
  return true;
}

