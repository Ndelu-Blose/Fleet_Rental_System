"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"

type ChecklistItem = {
  id: string
  label: string
  completed: boolean
  pending: boolean
  actionLabel?: string
  actionHref?: string
}

export function SetupChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChecklist()
  }, [])

  const fetchChecklist = async () => {
    try {
      const res = await fetch("/api/admin/system/readiness")
      const data = await res.json()
      
      if (data && data.checklist) {
        setItems(data.checklist)
      }
    } catch (error) {
      console.error("Failed to fetch checklist:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const completedCount = items.filter((i) => i.completed).length
  const totalCount = items.length
  const allCompleted = completedCount === totalCount

  if (allCompleted) {
    return null // Don't show checklist if everything is complete
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Setup Checklist
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-muted-foreground">
          {completedCount} of {totalCount} items completed
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
              <div className="flex items-center gap-2 flex-1">
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : item.pending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-gray-400" />
                )}
                <span className={`text-sm ${item.completed ? "text-green-700" : "text-gray-700"}`}>
                  {item.label}
                </span>
              </div>
              {!item.completed && item.actionHref && (
                <Button variant="outline" size="sm" asChild>
                  <Link href={item.actionHref}>{item.actionLabel || "Complete"}</Link>
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
