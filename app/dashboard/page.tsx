import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function Dashboard() {
  const session = await auth()
  
  if (!session?.user) {
    redirect("/login")
  }

  // Redirect based on user role
  if (session.user.role === "ADMIN") {
    redirect("/admin")
  } else {
    redirect("/driver")
  }
}

