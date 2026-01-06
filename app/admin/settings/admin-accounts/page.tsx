import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import AdminAccountsClient from "./admin-accounts-client";

export default async function AdminAccountsPage() {
  await requireAdmin();

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: {
      id: true,
      email: true,
      name: true,
      isActive: true,
      isEmailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <AdminAccountsClient admins={admins} />;
}

