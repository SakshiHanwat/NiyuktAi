import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { Card, EmptyState, ScoreBadge, Stat, StageBadge } from "@/components/app/primitives"

const STAGE_ORDER = ["applied", "screened", "shortlisted", "interview", "offer", "rejected"] as const

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: candidates }, { count: totalCount }, { count: shortlistedCount }, { count: interviewCount }] =
    await Promise.all([
      supabase
        .from("candidates")
        .select("id, name, stage, score, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("candidates").select("*", { count: "exact", head: true }),
      supabase.from("candidates").select("*", { count: "exact", head: true }).eq("stage", "shortlisted"),
      supabase.from("candidates").select("*", { count: "exact", head: true }).eq("stage", "interview"),
    ])

  const all = candidates ?? []
  const total = totalCount ?? 0
  const recent = all.slice(0, 5)

  // Avg score (only over candidates with score > 0)
  const scored = all.filter((c) => Number(c.score) > 0)
  const avgScore =
    scored.length > 0
      ? Math.round(scored.reduce((sum, c) => sum + Number(c.score), 0) / scored.length)
      : 0

  // Pipeline counts
  const stageCounts = STAGE_ORDER.reduce<Record<string, number>>((acc, s) => {
    acc[s] = 0
    return acc
  }, {})
  for (const c of all) {
    const s = (c.stage ?? "applied").toLowerCase()
    if (s in stageCounts) stageCounts[s]++
  }

  return (
    <div>
      <PageHeader title="Overview" subtitle="Your recruitment pipeline at a glance" />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Total Candidates" value={total} />
        <Stat label="Shortlisted" value={shortlistedCount ?? 0} />
        <Stat label="Interviews" value={interviewCount ?? 0} />
        <Stat label="Avg Score" value={avgScore} hint="of scored candidates" />
      </div>

      {/* Pipeline bar */}
      <Card className="p-6 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-foreground">Pipeline distribution</h2>
          <span className="text-[11px] font-mono text-muted-foreground">{total} total</span>
        </div>
        <PipelineBar counts={stageCounts} total={total} />
      </Card>

      {/* Recent candidates */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-sm font-medium text-foreground">Recent candidates</h2>
          <Link
            href="/candidates"
            className="text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No candidates yet"
              description="Upload a resume to begin — the agent will parse, score, and decide automatically."
              action={
                <Link
                  href="/upload"
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Upload resume
                </Link>
              }
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recent.map((c) => (
              <Link
                key={c.id}
                href={`/candidates/${c.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
              >
                <span className="flex-1 text-sm text-foreground truncate">{c.name}</span>
                <StageBadge stage={c.stage} />
                <ScoreBadge score={Number(c.score)} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function PipelineBar({ counts, total }: { counts: Record<string, number>; total: number }) {
  if (total === 0) {
    return (
      <div className="flex flex-col gap-3">
        <div className="h-2 w-full rounded-full bg-muted" />
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {STAGE_ORDER.map((s) => (
            <div key={s} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-muted" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
                {s} 0
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Shades from white → dark gray
  const shades = ["#ffffff", "#cccccc", "#999999", "#666666", "#444444", "#262626"]

  return (
    <div className="flex flex-col gap-4">
      <div className="h-2 w-full rounded-full overflow-hidden flex bg-muted">
        {STAGE_ORDER.map((s, i) => {
          const pct = (counts[s] / total) * 100
          if (pct <= 0) return null
          return (
            <div
              key={s}
              className="h-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: shades[i] }}
              title={`${s}: ${counts[s]}`}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAGE_ORDER.map((s, i) => (
          <div key={s} className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: shades[i] }} />
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground truncate">
              {s}
            </span>
            <span className="text-[11px] font-mono text-foreground ml-auto">{counts[s]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
