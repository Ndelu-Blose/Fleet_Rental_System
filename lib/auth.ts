import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim()
        const password = credentials?.password

        if (!email || !password) {
          console.error("[Auth] Missing credentials")
          return null
        }

        try {
          // Find user by email - using explicit select to match DB schema
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              password: true, // ✅ IMPORTANT: your DB column is "password"
              isEmailVerified: true,
              isActive: true, // ✅ This field exists in schema (defaults to true)
              driverProfile: { select: { id: true } }, // if relation exists
            },
          })

          // User not found
          if (!user) {
            console.error("[Auth] ❌ User not found:", email)
            return null
          }

          // ✅ ENHANCED: Log all user state for debugging
          console.log("[Auth] ✅ Found user:", {
            id: user.id,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            isActive: user.isActive,
            hasPassword: Boolean(user.password),
            passwordStartsWith: user.password?.substring(0, 7) || "none",
            hasDriverProfile: Boolean(user.driverProfile?.id),
          })

          if (!user.password) {
            console.error("[Auth] LOGIN BLOCKED: User has no password set", {
              email,
              userId: user.id,
              hasPassword: false,
            })
            return null
          }

          // ✅ Check isActive - only block if explicitly false
          // Allow null/undefined for backward compatibility (existing users might not have this set)
          // Schema defaults to true, so new users will have true
          if (user.isActive === false) {
            console.error("[Auth] ❌ LOGIN BLOCKED: User account is inactive", {
              email,
              userId: user.id,
              role: user.role,
              isActive: user.isActive,
              isEmailVerified: user.isEmailVerified,
            })
            return null
          }

          // ✅ Check isEmailVerified - only block if explicitly false
          // Allow null/undefined for backward compatibility (admin users created before email verification)
          // For DRIVER role, require email verification (must be true, not null)
          // For ADMIN role, allow null/undefined but block if explicitly false
          if (user.role === "DRIVER") {
            // Drivers must have isEmailVerified === true (not null, not false)
            if (user.isEmailVerified !== true) {
              console.error("[Auth] ❌ LOGIN BLOCKED: Driver email not verified", {
                email,
                userId: user.id,
                role: user.role,
                isActive: user.isActive,
                isEmailVerified: user.isEmailVerified,
              })
              return null
            }
          } else if (user.role === "ADMIN") {
            // Admins: only block if explicitly false (allow null/undefined for backward compatibility)
            if (user.isEmailVerified === false) {
              console.error("[Auth] ❌ LOGIN BLOCKED: Admin email not verified", {
                email,
                userId: user.id,
                role: user.role,
                isActive: user.isActive,
                isEmailVerified: user.isEmailVerified,
              })
              return null
            }
          }

          // Verify password - using user.password (matches DB column name)
          const ok = await bcrypt.compare(password, user.password)
          if (!ok) {
            console.error("[Auth] LOGIN BLOCKED: Password mismatch", {
              email,
              userId: user.id,
              hasPassword: true,
              passwordLength: user.password?.length || 0,
            })
            return null
          }

          // Log successful login for debugging
          console.log("[Auth] Login successful", {
            email,
            userId: user.id,
            role: user.role,
            isActive: user.isActive,
            isEmailVerified: user.isEmailVerified,
          })

          // Return user object for NextAuth
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            driverProfileId: user.driverProfile?.id,
          }
        } catch (error) {
          console.error("[Auth] ❌ Auth error:", {
            email,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          })
          return null
        }
      },
    }),
  ],
  session: { strategy: "jwt" },

  callbacks: {
    async jwt({ token, user, trigger }) {
      // runs on sign-in (user exists) and subsequent calls (user undefined)
      if (user) {
        token.role = user.role
        token.isEmailVerified = user.isEmailVerified
        token.driverProfileId = user.driverProfileId
        token.email = user.email
        token.name = user.name
        token.sub = user.id // ✅ Explicitly set sub to user.id
        token.lastRefreshed = Date.now()
      }

      // Refresh user data from database if:
      // 1. Token is older than 5 minutes (to catch email changes)
      // 2. Or explicitly triggered via update() call
      const shouldRefresh = 
        trigger === "update" || 
        !token.lastRefreshed || 
        Date.now() - (token.lastRefreshed as number) > 5 * 60 * 1000

      if (shouldRefresh && token.sub) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.sub },
            select: {
              email: true,
              name: true,
              role: true,
              isEmailVerified: true,
              driverProfile: {
                select: {
                  id: true,
                },
              },
            },
          })

          if (dbUser) {
            token.email = dbUser.email
            token.name = dbUser.name
            token.role = dbUser.role as "ADMIN" | "DRIVER"
            token.isEmailVerified = dbUser.isEmailVerified
            token.driverProfileId = dbUser.driverProfile?.id
            token.lastRefreshed = Date.now()
          }
        } catch (error) {
          console.error("[Auth] Failed to refresh user data:", error)
          // Continue with existing token data if refresh fails
        }
      }

      return token
    },
    async session({ session, token }) {
      session.user.id = token.sub as string
      session.user.role = token.role as "ADMIN" | "DRIVER"
      session.user.isEmailVerified = Boolean(token.isEmailVerified)
      session.user.driverProfileId = token.driverProfileId as string | undefined
      session.user.email = (token.email as string) ?? session.user.email
      session.user.name = (token.name as string) ?? session.user.name
      return session
    },
    async redirect({ url, baseUrl }) {
      // Handle redirects after login
      // If URL is relative, make it absolute
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // If URL is from same origin, allow it
      if (new URL(url).origin === baseUrl) return url
      // Default to baseUrl
      return baseUrl
    },
  },
  pages: {
    signIn: "/login",
  },

  // ✅ Turn this on temporarily to see real auth errors in Vercel logs
  debug: true,
})
