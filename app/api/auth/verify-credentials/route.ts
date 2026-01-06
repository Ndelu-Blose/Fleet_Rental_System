import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { withRateLimit } from "@/lib/rate-limit"

export async function POST(request: Request) {
  // Apply rate limiting (5 attempts per 15 minutes)
  const rateLimitResponse = await withRateLimit({ windowMs: 15 * 60 * 1000, maxRequests: 5 })(request)
  if (rateLimitResponse) {
    return rateLimitResponse
  }

  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { driverProfile: true },
    })

    if (!user) {
      console.error("[Auth] User not found:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!user.password) {
      console.error("[Auth] User has no password set:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (!user.isActive) {
      console.error("[Auth] User account is inactive:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const isValid = await bcrypt.compare(password, user.password)

    if (!isValid) {
      console.error("[Auth] Password mismatch for user:", email)
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      driverProfileId: user.driverProfile?.id,
    })
  } catch (error) {
    console.error("[Auth] Verify credentials error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
