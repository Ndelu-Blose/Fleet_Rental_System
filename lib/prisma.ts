import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// #region agent log
fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:7',message:'Prisma client initialization start',data:{hasExisting:!!globalForPrisma.prisma,nodeEnv:process.env.NODE_ENV,hasDbUrl:!!process.env.DATABASE_URL,hasDirectUrl:!!process.env.DIRECT_URL},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

// #region agent log
fetch('http://127.0.0.1:7243/ingest/fdfd108c-8382-4a11-b6ab-18addac549f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/prisma.ts:10',message:'Prisma client initialized',data:{isNew:!globalForPrisma.prisma},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
// #endregion

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
