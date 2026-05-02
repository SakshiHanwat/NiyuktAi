"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Plus, ChevronRight } from "lucide-react"

const LABELS: Record<string, string> = {
  dashboard: "Overview",
  jobs: "Jobs",
  new: "New",
  candidates: "Candidates",
  pipeline: "Pipeline",
  upload: "Resume Upload",
  compare: "Compare",
  emails: "Email Assistant",
  bias: "Bias Audit",
  agents: "Agents",
  settings: "Settings",
}

export function TopBar() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <header className="sticky top-0 z-20 h-14 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground min-w-0 overflow-hidden">
        <Link href="/dashboard" className="hover:text-foreground transition-colors">
          niyuktai
        </Link>
        {segments.map((seg, idx) => {
          const href = "/" + segments.slice(0, idx + 1).join("/")
          const isLast = idx === segments.length - 1
          const label = LABELS[seg] ?? decodeURIComponent(seg)
          return (
            <span key={href} className="flex items-center gap-2 min-w-0">
              <ChevronRight className="w-3 h-3 shrink-0 text-muted-foreground/50" />
              {isLast ? (
                <span className="text-foreground truncate">{label}</span>
              ) : (
                <Link href={href} className="hover:text-foreground transition-colors truncate">
                  {label}
                </Link>
              )}
            </span>
          )
        })}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/jobs/new"
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          New Job
        </Link>
      </div>
    </header>
  )
}
