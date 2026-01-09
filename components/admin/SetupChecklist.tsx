"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, AlertCircle, ChevronDown } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

type ChecklistItem = {
  id: string
  label: string
  completed: boolean
  pending: boolean
  actionLabel?: string
  actionHref?: string
  hint?: string
}

export function SetupChecklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

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
      <Card className="border-blue-200 bg-blue-50/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const completedCount = items.filter((i) => i.completed).length
  const total = items.length
  const percent = total === 0 ? 0 : Math.round((completedCount / total) * 100)

  const incomplete = items.filter((i) => !i.completed)
  const completed = items.filter((i) => i.completed)

  const next = incomplete[0] // next step: first incomplete item

  // Don't show if everything is complete
  if (completedCount === total) {
    return null
  }

  return (
    <Card className="border-blue-200 bg-blue-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-base">Setup Progress</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Finish these steps to start renting vehicles and collecting payments.
            </p>
          </div>

          {next ? (
            <Link href={next.actionHref || "#"}>
              <Button size="sm">{next.actionLabel || "Get started"}</Button>
            </Link>
          ) : (
            <Button size="sm" variant="secondary" disabled>
              All done ✅
            </Button>
          )}
        </div>

        <div className="pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium">
              {completedCount} of {total} completed
            </span>
            <span className="text-xs text-muted-foreground">{percent}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* NEXT STEP highlight */}
        {next && (
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-orange-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-900 mb-1">Next step</p>
                <p className="text-sm text-orange-800 mb-2">{next.label}</p>
                {next.hint && (
                  <p className="text-xs text-orange-700 italic">{next.hint}</p>
                )}
                {next.actionHref && (
                  <Link href={next.actionHref}>
                    <Button size="sm" className="mt-2" variant="default">
                      {next.actionLabel || "Continue"}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Incomplete items (compact list) */}
        {incomplete.length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Remaining steps
            </p>
            {incomplete.slice(1, 5).map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center justify-between rounded-md border bg-white px-3 py-2.5",
                  item.pending && "border-orange-200 bg-orange-50/50"
                )}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-900">{item.label}</span>
                    {item.hint && (
                      <p className="text-xs text-muted-foreground mt-0.5">{item.hint}</p>
                    )}
                  </div>
                </div>
                {item.actionHref && (
                  <Link href={item.actionHref}>
                    <Button size="sm" variant="outline" className="ml-2 flex-shrink-0">
                      {item.actionLabel || "Go"}
                    </Button>
                  </Link>
                )}
              </div>
            ))}

            {incomplete.length > 5 && (
              <p className="text-xs text-muted-foreground pl-7">
                + {incomplete.length - 5} more step{incomplete.length - 5 !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Completed toggle */}
        {completed.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowCompleted((v) => !v)}
              className="flex w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
            >
              <span className="text-muted-foreground">
                Show completed ({completed.length})
              </span>
              <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", showCompleted && "rotate-180")} />
            </button>

            {showCompleted && (
              <div className="space-y-2">
                {completed.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2.5 rounded-md border bg-white px-3 py-2.5 opacity-75"
                  >
                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground line-through">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
