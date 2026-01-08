import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Test database connection
    const users = await prisma.user.findMany({ select: { id: true } })
    const userCount = users.length
    
    return NextResponse.json({
      ok: true,
      database: "connected",
      users: userCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Database connection failed",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}



