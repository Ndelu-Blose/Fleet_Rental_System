"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronDown, ChevronUp, Lock, Clock3, CheckCircle2, AlertCircle } from "lucide-react"

type StepState = "DONE" | "ACTION" | "WAITING" | "LOCKED"

export type SetupStep = {
  id: string
  label: string
  description?: string
  completed: boolean
  state: StepState
  hint?: string
  actionLabel?: string
  actionHref?: string
}

function StateIcon({ state }: { state: StepState }) {
  if (state === "DONE") return <CheckCircle2 className="h-4 w-4 text-green-600" />
  if (state === "WAITING") return <Clock3 className="h-4 w-4 text-amber-600" />
  if (state === "LOCKED") return <Lock className="h-4 w-4 text-muted-foreground" />
  return <AlertCircle className="h-4 w-4 text-blue-600" />
}

function pillClasses(state: StepState) {
  switch (state) {
    case "DONE":
      return "bg-green-50 text-green-700 border-green-200"
    case "WAITING":
      return "bg-amber-50 text-amber-700 border-amber-200"
    case "LOCKED":
      return "bg-muted text-muted-foreground border-border"
    default:
      return "bg-blue-50 text-blue-700 border-blue-200"
  }
}

function pillLabel(state: StepState) {
  switch (state) {
    case "DONE":
      return "Done"
    case "WAITING":
      return "Waiting"
    case "LOCKED":
      return "Locked"
    default:
      return "Needs action"
  }
}

export function SetupProgressCard({ steps }: { steps: SetupStep[] }) {
  const [expanded, setExpanded] = React.useState(false)

  const total = steps.length
  const done = steps.filter((s) => s.completed).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  const nextActionable =
    steps.find((s) => !s.completed && s.state === "ACTION") ||
    steps.find((s) => !s.completed && (s.state === "WAITING" || s.state === "LOCKED")) ||
    null

  const remaining = steps.filter((s) => !s.completed)
  const completed = steps.filter((s) => s.completed)

  // Show success state if all done
  if (done === total) {
    return (
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Setup complete!
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            All setup steps are complete. You're ready to start renting vehicles and collecting payments.
          </p>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-base">Setup progress</CardTitle>
          <p className="text-sm text-muted-foreground">
            Finish these steps to start renting vehicles and collecting payments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {nextActionable?.actionHref && nextActionable?.actionLabel ? (
            <Button asChild size="sm">
              <Link href={nextActionable.actionHref}>{nextActionable.actionLabel}</Link>
            </Button>
          ) : null}

          <Button variant="outline" size="sm" onClick={() => setExpanded((v) => !v)}>
            {expanded ? (
              <>
                Collapse <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Expand <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary line */}
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {done} of {total} completed
          </span>
          <span className="text-muted-foreground">{percent}%</span>
        </div>

        <Progress value={percent} />

        {/* Collapsed "Next step" preview */}
        {!expanded && nextActionable ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StateIcon state={nextActionable.state} />
                  <span className="font-medium">Next step</span>
                  <span className={`ml-2 rounded-full border px-2 py-0.5 text-xs ${pillClasses(nextActionable.state)}`}>
                    {pillLabel(nextActionable.state)}
                  </span>
                </div>
                <div className="text-sm">{nextActionable.label}</div>
                {nextActionable.hint ? (
                  <div className="text-xs text-muted-foreground">{nextActionable.hint}</div>
                ) : null}
              </div>

              {nextActionable.actionHref && nextActionable.actionLabel ? (
                <Button asChild size="sm">
                  <Link href={nextActionable.actionHref}>{nextActionable.actionLabel}</Link>
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {/* Expanded sections */}
        {expanded ? (
          <div className="space-y-4">
            {/* Next step (expanded) */}
            {nextActionable ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StateIcon state={nextActionable.state} />
                      <span className="font-medium">Next step</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs ${pillClasses(nextActionable.state)}`}>
                        {pillLabel(nextActionable.state)}
                      </span>
                    </div>
                    <div className="text-sm font-medium">{nextActionable.label}</div>
                    {nextActionable.description ? (
                      <div className="text-xs text-muted-foreground">{nextActionable.description}</div>
                    ) : null}
                    {nextActionable.hint ? (
                      <div className="text-xs text-muted-foreground">{nextActionable.hint}</div>
                    ) : null}
                  </div>

                  {nextActionable.actionHref && nextActionable.actionLabel ? (
                    <Button asChild>
                      <Link href={nextActionable.actionHref}>{nextActionable.actionLabel}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Remaining steps */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Remaining steps
              </div>

              <div className="space-y-2">
                {remaining.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StateIcon state={s.state} />
                        <div className="text-sm font-medium">{s.label}</div>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${pillClasses(s.state)}`}>
                          {pillLabel(s.state)}
                        </span>
                      </div>
                      {s.hint ? <div className="text-xs text-muted-foreground">{s.hint}</div> : null}
                    </div>

                    {s.state === "ACTION" && s.actionHref && s.actionLabel ? (
                      <Button asChild variant="outline" size="sm">
                        <Link href={s.actionHref}>{s.actionLabel}</Link>
                      </Button>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        {s.state === "WAITING" ? "Waiting" : s.state === "LOCKED" ? "Locked" : ""}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Completed steps (collapsed section) */}
            {completed.length > 0 && (
              <details className="rounded-lg border bg-muted/20 p-3">
                <summary className="cursor-pointer select-none text-sm font-medium">
                  Already done ({completed.length})
                </summary>
                <div className="mt-3 space-y-2">
                  {completed.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
