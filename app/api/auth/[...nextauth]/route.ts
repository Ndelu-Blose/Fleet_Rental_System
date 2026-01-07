import { handlers } from "@/lib/auth"

export const { GET, POST } = handlers

// Ensure this runs in Node.js runtime (not Edge) for Prisma/bcrypt compatibility
export const runtime = "nodejs"
