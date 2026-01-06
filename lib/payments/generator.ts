import { FeeFrequency, PrismaClient } from "@prisma/client";

function clampDayOfMonth(day: number) {
  // Keep safe for all months (1-28)
  return Math.min(Math.max(day, 1), 28);
}

export function nextDueDate(params: {
  frequency: FeeFrequency;
  from: Date;
  dueWeekday?: number | null;     // 0=Sun..6=Sat (only for WEEKLY)
  dueDayOfMonth?: number | null;  // 1..28 (only for MONTHLY)
}) {
  const { frequency, from } = params;
  const d = new Date(from);

  if (frequency === "DAILY") {
    d.setDate(d.getDate() + 1);
    return d;
  }

  if (frequency === "WEEKLY") {
    // If dueWeekday is missing, default to same weekday as 'from'
    const target = typeof params.dueWeekday === "number" ? params.dueWeekday : d.getDay();
    const daysAhead = (target - d.getDay() + 7) % 7 || 7; // always move forward
    d.setDate(d.getDate() + daysAhead);
    return d;
  }

  // MONTHLY
  const day = clampDayOfMonth(typeof params.dueDayOfMonth === "number" ? params.dueDayOfMonth : 1);

  // Move to next month if today's date already passed the due day
  const candidate = new Date(d);
  candidate.setDate(day);

  if (candidate <= d) {
    candidate.setMonth(candidate.getMonth() + 1);
    candidate.setDate(day);
  }

  return candidate;
}

export async function createFirstPayment(tx: PrismaClient, args: {
  contractId: string;
  amountCents: number;
  startDate: Date;
  frequency: FeeFrequency;
  dueWeekday?: number | null;
  dueDayOfMonth?: number | null;
}) {
  const dueDate = nextDueDate({
    frequency: args.frequency,
    from: args.startDate,
    dueWeekday: args.dueWeekday,
    dueDayOfMonth: args.dueDayOfMonth,
  });

  return tx.payment.create({
    data: {
      contractId: args.contractId,
      amountCents: args.amountCents,
      dueDate,
      status: "PENDING",
    },
  });
}

