/**
 * Format ZAR currency (for amounts already in rands)
 * @param amount - Amount in rands (e.g., 2000 for R 2,000.00)
 * @returns Formatted string like "R 2,000.00"
 */
export function formatZAR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

/**
 * Format cents to ZAR currency string
 * @param amountCents - Amount in cents (e.g., 200000 for R 2,000.00)
 * @returns Formatted string like "R 2,000.00"
 */
export function formatZARFromCents(amountCents: number): string {
  const safe = Number.isFinite(amountCents) ? amountCents : 0;
  const amount = safe / 100;
  return formatZAR(amount);
}

/**
 * Robust parser for inputs like: "2000", "2,000", "2 000,50", "R 2,000.00"
 * @param input - User input as string or number
 * @returns Amount in rands (number), or 0 if invalid
 */
export function parseZARToNumber(input: string | number): number {
  if (!input) return 0;
  let s = String(input).trim().replace(/R/gi, "").replace(/\s/g, "");

  // Handle comma as decimal separator (common in some locales)
  // But keep thousand separators safe: "2,000.50" should become "2000.50"
  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasComma && !hasDot) {
    // "2000,50" -> "2000.50"
    s = s.replace(",", ".");
  } else {
    // "2,000.50" -> "2000.50" (remove thousand separators)
    s = s.replace(/,/g, "");
  }

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Convert user input -> cents
 * Accepts: "2000", "2,000", "2 000", "2000.50"
 * @param input - User input as string or number
 * @returns Amount in cents, or null if invalid
 */
export function parseZARToCents(input: string | number): number | null {
  const rands = parseZARToNumber(input);
  if (rands === 0 && String(input).trim() !== "0") return null;
  return Math.round(rands * 100);
}

/**
 * Convert Rands to cents (legacy helper, prefer parseZARToCents for user input)
 * @param rands - Amount in Rands (e.g., 2000 for R 2,000.00)
 * @returns Amount in cents (e.g., 200000)
 */
export function randsToCents(rands: number): number {
  return Math.round(Number(rands) * 100);
}

/**
 * Convert cents to Rands
 * @param cents - Amount in cents (e.g., 200000)
 * @returns Amount in Rands (e.g., 2000)
 */
export function centsToRands(cents: number): number {
  return (cents ?? 0) / 100;
}
