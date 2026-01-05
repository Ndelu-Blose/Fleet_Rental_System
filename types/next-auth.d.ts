import "next-auth"

declare module "next-auth" {
  interface User {
    role: "ADMIN" | "DRIVER"
    isEmailVerified: boolean
    driverProfileId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: "ADMIN" | "DRIVER"
      isEmailVerified: boolean
      driverProfileId?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "DRIVER"
    isEmailVerified: boolean
    driverProfileId?: string
  }
}
