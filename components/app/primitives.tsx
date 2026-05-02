import type React from "react"
import { cn } from "@/lib/utils"

/* Stage badges:
   - shortlisted   → white border outline
   - interview     → white filled
   - rejected      → dark gray
   - screening/hold → gray
   - applied/screened/offer → outlined gray (default)
*/
export function StageBadge({ stage }: { stage: string | null | undefined }) {
  const s = (stage ?? "applied").toLowerCase()
  const styles: Record<string, string> = {
    shortlisted: "border border-foreground text-foreground bg-transparent",
    interview: "bg-foreground text-background border border-foreground",
    rejected: "bg-[#1a1a1a] text-muted-foreground border border-[#1a1a1a]",
    hold: "bg-muted text-muted-foreground border border-border",
    screening: "bg-muted text-muted-foreground border border-border",
    screened: "border border-border text-muted-foreground bg-transparent",
    applied: "border border-border text-muted-foreground bg-transparent",
    offer: "border border-border text-muted-foreground bg-transparent",
  }
  const cls = styles[s] ?? "border border-border text-muted-foreground bg-transparent"
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider",
        cls,
      )}
    >
      {s}
    </span>
  )
}

export function ScoreBadge({ score, size = "sm" }: { score: number | null | undefined; size?: "sm" | "lg" }) {
  const value = typeof score === "number" ? Math.round(score) : 0
  const cls = size === "lg" ? "text-3xl px-3 py-1" : "text-xs px-2 py-0.5"
  return (
    <span className={cn("inline-flex items-center font-mono text-foreground bg-muted border border-border rounded-md", cls)}>
      {value}
    </span>
  )
}

export function SkillPill({ children, variant = "solid" }: { children: React.ReactNode; variant?: "solid" | "dashed" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-mono",
        variant === "dashed"
          ? "border border-dashed border-border text-muted-foreground"
          : "border border-foreground text-foreground",
      )}
    >
      {children}
    </span>
  )
}

export function Card({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode
  className?: string
  as?: "div" | "section" | "article"
}) {
  const Tag = as
  return (
    <Tag className={cn("bg-card border border-border rounded-xl", className)}>
      {children}
    </Tag>
  )
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 bg-card border border-dashed border-border rounded-xl",
        className,
      )}
    >
      <h3 className="text-base font-medium text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm font-mono text-muted-foreground max-w-md mb-5">{description}</p>
      )}
      {action}
    </div>
  )
}

export function ErrorState({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 bg-card border border-border rounded-xl",
        className,
      )}
    >
      <h3 className="text-sm font-medium text-foreground mb-1">Something went wrong</h3>
      <p className="text-xs font-mono text-muted-foreground">{message}</p>
    </div>
  )
}

export function LoadingState({ label = "Loading...", className }: { label?: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-2 py-12 text-xs font-mono text-muted-foreground",
        className,
      )}
    >
      <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse" />
      <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.2s]" />
      <span className="inline-block w-1 h-1 rounded-full bg-muted-foreground animate-pulse [animation-delay:0.4s]" />
      <span className="ml-2">{label}</span>
    </div>
  )
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <Card className="p-5">
      <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">{label}</p>
      <p className="text-4xl font-mono text-foreground leading-none">{value}</p>
      {hint && <p className="mt-3 text-[11px] font-mono text-muted-foreground">{hint}</p>}
    </Card>
  )
}
