"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function LoginRefresh() {
  const router = useRouter()

  useEffect(() => {
    router.refresh()
  }, [router])

  return null
}
