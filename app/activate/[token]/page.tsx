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
    if (pwd.length === 0) return { strength: 0, label: "", color: "", message: "" }
    if (pwd.length < 8) return { strength: 1, label: "Keep going", color: "text-orange-600", message: "Add more characters" }
    if (pwd.length < 12 && !/[A-Z]/.test(pwd) && !/[0-9]/.test(pwd)) {
      return { strength: 2, label: "Getting better", color: "text-yellow-600", message: "Try adding numbers or capital letters" }
    }
    if (pwd.length >= 12 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
      return { strength: 4, label: "Perfect!", color: "text-green-600", message: "Great password!" }
    }
    return { strength: 3, label: "Looking good", color: "text-green-600", message: "Almost there!" }
  }

  const passwordStrength = getPasswordStrength(password)
  const passwordsMatch = password && confirmPassword && password === confirmPassword
  const isFormValid = password.length >= 8 && passwordsMatch && !loading

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("The passwords don't match. Please make sure both boxes have the same password.")
      return
    }

    if (password.length < 8) {
      setError("Your password needs to be at least 8 characters long. Try adding a few more characters.")
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
        // Handle specific error cases with friendly messages
        const errorMsg = data.error || data.message || "Unknown error"
        
        if (errorMsg.includes("expired") || errorMsg.toLowerCase().includes("expired")) {
          setError("This link has expired. Please ask your manager to send you a new activation link.")
        } else if (errorMsg.includes("Invalid") || errorMsg.toLowerCase().includes("invalid")) {
          setError("This link has already been used or isn't valid. Please ask your manager for a new link.")
        } else if (errorMsg.includes("Validation failed")) {
          setError("There was a problem with the information you entered. Please check your password and try again.")
        } else {
          // Show more helpful error message
          const friendlyError = process.env.NODE_ENV === 'development' && data.message 
            ? data.message 
            : "We couldn't activate your account right now. Please try again, or contact your manager if the problem continues."
          setError(friendlyError)
        }
        
        // Log error for debugging
        console.error("[Activation] Activation failed:", {
          status: res.status,
          error: errorMsg,
          data,
        })
        return
      }

      // Success!
      setSuccess(true)
    } catch (err) {
      setError("Something went wrong. Please check your internet connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="rounded-full bg-green-100 p-4 animate-bounce">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-gray-900">You're all set! 🎉</h2>
                <p className="text-gray-600 text-lg">
                  Your account is ready to use. We're taking you to the login page now.
                </p>
              </div>
              <Button
                onClick={() => router.push("/login?activated=true&message=Account activated successfully! Please sign in.")}
                className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
                size="lg"
              >
                Sign In Now
              </Button>
              <p className="text-sm text-gray-500">
                Don't worry, we'll redirect you automatically in a few seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto rounded-full bg-blue-100 p-4 w-fit">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold text-gray-900">Welcome to FleetHub!</CardTitle>
            <CardDescription className="text-base text-gray-600">
              Just one more step — create your password and you're ready to go!
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleActivate} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-base font-medium">
                Choose Your Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Type your password here"
                  required
                  className="pr-10 h-11 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {password && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {password.length} characters
                    </span>
                  </div>
                  {passwordStrength.message && (
                    <p className="text-xs text-gray-600 italic">
                      {passwordStrength.message}
                    </p>
                  )}
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        passwordStrength.strength === 1
                          ? "bg-orange-400 w-1/4"
                          : passwordStrength.strength === 2
                          ? "bg-yellow-400 w-2/4"
                          : passwordStrength.strength === 3
                          ? "bg-green-400 w-3/4"
                          : passwordStrength.strength === 4
                          ? "bg-green-600 w-full"
                          : ""
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm" className="text-base font-medium">
                Type It Again
              </Label>
              <div className="relative">
                <Input
                  id="confirm"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type the same password again"
                  required
                  className="pr-10 h-11 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {confirmPassword && (
                <div className="text-sm pt-1">
                  {passwordsMatch ? (
                    <span className="text-green-600 flex items-center gap-2 font-medium">
                      <CheckCircle2 className="h-4 w-4" />
                      Perfect! Your passwords match
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Oops! These don't match — please try again
                    </span>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-4 text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium mb-1">Something went wrong</p>
                  <p className="text-red-600">{error}</p>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Quick Tips for Your Password
              </p>
              <ul className="text-sm text-gray-700 space-y-1.5 ml-6 list-disc">
                <li>Make it at least 8 characters long</li>
                <li>Mix in some numbers (like 123) and capital letters</li>
                <li>Pick something you'll remember but others won't guess</li>
              </ul>
            </div>

            <Button 
              type="submit" 
              disabled={!isFormValid || loading} 
              className="w-full h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Activate My Account
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
