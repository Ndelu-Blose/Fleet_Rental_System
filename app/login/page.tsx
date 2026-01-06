import { redirect } from "next/navigation"
import { auth, signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { AuthError } from "next-auth"

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; message?: string }>
}) {
  const session = await auth()
  const params = await searchParams

  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/driver")
  }

  async function handleLogin(formData: FormData) {
    "use server"
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string
      
      // Verify credentials first to determine redirect path
      const verifyResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/verify-credentials`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      )
      
      if (!verifyResponse.ok) {
        redirect("/login?error=Invalid email or password")
        return
      }
      
      const user = await verifyResponse.json()
      const redirectPath = user.role === "ADMIN" ? "/admin" : "/driver"
      
      await signIn("credentials", {
        email,
        password,
        redirectTo: redirectPath,
      })
    } catch (error) {
      if (error instanceof AuthError) {
        switch (error.type) {
          case "CredentialsSignin":
            redirect("/login?error=Invalid email or password")
            break
          default:
            redirect("/login?error=An error occurred. Please try again.")
        }
      } else {
        console.error("[Login] Unexpected error:", error)
        redirect("/login?error=An error occurred. Please try again.")
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>FleetHub Login</CardTitle>
          <CardDescription>Sign in to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleLogin} className="space-y-4">
            {params?.error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {params.error}
              </div>
            )}
            {params?.message && (
              <div className="rounded-md bg-green-500/15 p-3 text-sm text-green-600">
                {params.message}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" placeholder="you@example.com" required />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
