import { prisma } from "@/lib/prisma";
import { getSettingBool } from "@/lib/settings";
import { nextDueDate } from "./generator";

export async function markPaymentPaid(paymentId: string) {
  const auto = await getSettingBool("payments.autoGenerateNext", true);

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.update({
      where: { id: paymentId },
      data: { status: "PAID", paidAt: new Date() },
      include: { contract: true },
    });

    if (!auto) return payment;

    // Only generate next payment if contract is still active
    if (payment.contract.status !== "ACTIVE") {
      return payment;
    }

    // Create next payment
    const dueDate = nextDueDate({
      frequency: payment.contract.frequency,
      from: payment.dueDate,
      dueWeekday: payment.contract.dueWeekday,
      dueDayOfMonth: payment.contract.dueDayOfMonth,
    });

    // Check if next payment already exists
    const existing = await tx.payment.findFirst({
      where: {
        contractId: payment.contractId,
        dueDate,
      },
    });

    if (!existing) {
      await tx.payment.create({
        data: {
          contractId: payment.contractId,
          amountCents: payment.contract.feeAmountCents,
          dueDate,
          status: "PENDING",
        },
      });
    }

    return payment;
  });
}

