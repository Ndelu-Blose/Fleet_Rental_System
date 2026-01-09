import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { withTimeout } from "@/lib/server/timeout"

export async function requireAuth() {
  const session = await withTimeout(auth(), 12000)
  if (!session?.user) {
    redirect("/login")
  }
  return session
}

export async function requireAdmin() {
  const session = await requireAuth()
  if (session.user.role !== "ADMIN") {
    redirect("/driver")
  }
  return session
}

export async function requireDriver() {
  const session = await requireAuth()
  if (session.user.role !== "DRIVER") {
    redirect("/admin")
  }
  return session
}
