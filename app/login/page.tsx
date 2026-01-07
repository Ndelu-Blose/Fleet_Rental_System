import { redirect } from "next/navigation"
import { auth, signIn } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

// Force dynamic rendering to ensure Server Actions work on Vercel
export const dynamic = "force-dynamic"
export const revalidate = 0

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

      // Let Auth.js handle verification - redirect to dashboard which will route by role
      await signIn("credentials", {
        email,
        password,
        redirectTo: "/dashboard",
      })
    } catch (error: any) {
      // Handle authentication errors
      if (error?.type === "CredentialsSignin" || error?.cause?.err?.message?.includes("credentials")) {
        redirect("/login?error=Invalid email or password")
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
