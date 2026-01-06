import { type NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/permissions";
import { markPaymentPaid } from "@/lib/payments/markPaid";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const payment = await markPaymentPaid(id);

    return NextResponse.json({ success: true, payment });
  } catch (error: any) {
    console.error("[v0] Mark payment paid error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to mark payment as paid" },
      { status: 500 }
    );
  }
}
