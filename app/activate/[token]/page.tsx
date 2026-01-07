"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, Lock, Eye, EyeOff, AlertCircle } from "lucide-react"

export default function ActivatePage() {
  const params = useParams()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Auto-redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/login?activated=true&message=Account activated successfully! Please sign in.")
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length === 0) return { strength: 0, label: "", color: "" }
    if (pwd.length < 8) return { strength: 1, label: "Too short", color: "text-red-600" }
    if (pwd.length < 12 && !/[A-Z]/.test(pwd) && !/[0-9]/.test(pwd)) {
      return { strength: 2, label: "Weak", color: "text-orange-600" }
    }
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { strength: 4, label: "Strong", color: "text-green-600" }
    }
    return { strength: 3, label: "Good", color: "text-yellow-600" }
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const isFormValid = password.length >= 8 && passwordsMatch && !loading

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please check and try again.")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/activation/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          password,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Handle specific error cases
        if (data.error?.includes("expired")) {
          setError("This activation link has expired. Please contact your administrator for a new link.")
        } else if (data.error?.includes("Invalid")) {
          setError("This activation link is invalid or has already been used.")
        } else {
          setError(data.error || "Activation failed. Please try again or contact support.")
        }
        return
      }

      // Success!
      setSuccess(true)
    } catch (err) {
      setError("An error occurred. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="rounded-full bg-green-100 p-3">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Account Activated!</h2>
                <p className="text-muted-foreground">
                  Your account has been successfully activated. You'll be redirected to the login page in a moment.
                </p>
              </div>
              <Button
                onClick={() => router.push("/login?activated=true&message=Account activated successfully! Please sign in.")}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto rounded-full bg-primary/10 p-3 w-fit">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome to FleetHub!</CardTitle>
          <CardDescription>
            Create a secure password to activate your account and get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Create Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter a strong password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className={passwordStrength.color}>{passwordStrength.label}</span>
                    <span className="text-muted-foreground">
                      {password.length} / 8+ characters
                    </span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength.strength === 1
                          ? "bg-red-500 w-1/4"
                          : passwordStrength.strength === 2
                          ? "bg-orange-500 w-2/4"
                          : passwordStrength.strength === 3
                          ? "bg-yellow-500 w-3/4"
                          : passwordStrength.strength === 4
                          ? "bg-green-500 w-full"
                          : ""
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <div className="text-xs">
                  {passwordsMatch ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Passwords match
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Passwords do not match
                    </span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Password requirements:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>At least 8 characters long</li>
                <li>Use a mix of letters, numbers, and symbols for better security</li>
              </ul>
            </div>

            <Button type="submit" disabled={!isFormValid || loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating Account...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Activate Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
