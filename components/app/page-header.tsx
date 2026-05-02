import type React from "react"
import { cn } from "@/lib/utils"

export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-10 flex-wrap", className)}>
      <div className="flex flex-col gap-2 min-w-0">
        <h1 className="font-display text-5xl md:text-6xl leading-none text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm font-mono text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
