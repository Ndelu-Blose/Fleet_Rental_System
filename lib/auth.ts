import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        try {
          // Find user by email
          const user = await prisma.user.findUnique({
            where: { email: (credentials.email as string).toLowerCase().trim() },
            include: { driverProfile: true },
          })

          if (!user) {
            console.error("[Auth] User not found:", credentials.email)
            return null
          }

          if (!user.password) {
            console.error("[Auth] User has no password set:", credentials.email)
            return null
          }

          if (!user.isActive) {
            console.error("[Auth] User account is inactive:", credentials.email)
            return null
          }

          // Verify password
          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isValid) {
            console.error("[Auth] Password mismatch for user:", credentials.email)
            return null
          }

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
          console.error("[Auth] Auth error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign in - store user data
      if (user) {
        token.role = user.role
        token.email = user.email
        token.name = user.name
        token.isEmailVerified = user.isEmailVerified
        token.driverProfileId = user.driverProfileId
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
      if (session.user) {
        session.user.id = token.sub!
        session.user.email = (token.email as string) || ""
        session.user.name = (token.name as string | null) || null
        session.user.role = token.role as "ADMIN" | "DRIVER"
        session.user.isEmailVerified = token.isEmailVerified as boolean
        session.user.driverProfileId = token.driverProfileId as string | undefined
      }
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
})
