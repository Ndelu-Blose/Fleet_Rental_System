"use client"

import { CheckCircle2, Circle } from "lucide-react"

interface ProgressBarProps {
  percent: number
  className?: string
}

export function ProgressBar({ percent, className = "" }: ProgressBarProps) {
  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Profile Completion</span>
        <span className="text-sm font-medium">{percent}%</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

interface ChecklistItem {
  label: string
  completed: boolean
}

interface ProfileChecklistProps {
  items: ChecklistItem[]
}

export function ProfileChecklist({ items }: ProfileChecklistProps) {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-3">
          {item.completed ? (
            <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span className={item.completed ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
