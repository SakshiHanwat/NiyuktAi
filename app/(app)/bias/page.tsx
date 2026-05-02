import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { Stat, EmptyState, ErrorState } from "@/components/app/primitives"

export default async function BiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <ErrorState message="Not authenticated" />

  const { data: candidates, error: candidatesError } = await supabase
    .from("candidates")
    .select("id, name, stage, score")
    .eq("user_id", user.id)

  const { data: analyses, error: analysesError } = await supabase
    .from("ai_analysis")
    .select("id, candidate_id, final_score, decision, analysis, created_at, candidates!inner(name, stage, user_id)")
    .eq("candidates.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50)

  if (candidatesError || analysesError) {
    return (
      <div className="p-8">
        <ErrorState message={candidatesError?.message || analysesError?.message || "Failed to load audit data"} />
      </div>
    )
  }

  const list = analyses ?? []
  const candidatesList = candidates ?? []

  // Bias analysis: distribution by score band, by stage, decision frequency
  const total = list.length
  const decisions = list.reduce<Record<string, number>>((acc, a) => {
    const k = (a.decision || "unspecified").toLowerCase()
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const stageDistribution = candidatesList.reduce<Record<string, number>>((acc, c) => {
    const k = c.stage || "applied"
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {})

  const scoreBands = candidatesList.reduce(
    (acc, c) => {
      const s = Number(c.score) || 0
      if (s >= 80) acc.high++
      else if (s >= 60) acc.mid++
      else acc.low++
      return acc
    },
    { high: 0, mid: 0, low: 0 },
  )

  // Simple flag: imbalance if any single decision dominates >70%
  const flags: string[] = []
  Object.entries(decisions).forEach(([k, v]) => {
    if (total > 0 && v / total > 0.7) {
      flags.push(`Decision "${k}" appears in ${Math.round((v / total) * 100)}% of analyses — review for consistency.`)
    }
  })
  if (candidatesList.length > 0 && scoreBands.high / candidatesList.length > 0.6) {
    flags.push("Over 60% of candidates score above 80 — verify scoring calibration.")
  }
  if (candidatesList.length > 0 && scoreBands.low / candidatesList.length > 0.6) {
    flags.push("Over 60% of candidates score below 60 — consider relaxing baseline criteria.")
  }

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Bias Audit"
        subtitle="Transparency over every AI decision in your hiring funnel."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Total decisions" value={total} />
        <Stat label="Candidates audited" value={candidatesList.length} />
        <Stat label="Active flags" value={flags.length} />
      </div>

      {flags.length > 0 ? (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Flags</h2>
          <ul className="space-y-2">
            {flags.map((f, i) => (
              <li
                key={i}
                className="border border-border bg-card p-4 text-sm leading-relaxed"
              >
                {f}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Score distribution</h2>
        <div className="grid grid-cols-3 gap-4">
          <DistributionCell label="80 — 100" value={scoreBands.high} total={candidatesList.length} />
          <DistributionCell label="60 — 79" value={scoreBands.mid} total={candidatesList.length} />
          <DistributionCell label="0 — 59" value={scoreBands.low} total={candidatesList.length} />
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Stage distribution</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {["applied", "shortlisted", "interview", "offer", "rejected"].map((s) => (
            <DistributionCell
              key={s}
              label={s}
              value={stageDistribution[s] || 0}
              total={candidatesList.length}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Recent decisions</h2>
        {list.length === 0 ? (
          <EmptyState
            title="No decisions yet"
            description="AI analyses will appear here as you process candidates."
          />
        ) : (
          <div className="border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Candidate</th>
                  <th className="text-left p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Stage</th>
                  <th className="text-left p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Decision</th>
                  <th className="text-right p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Score</th>
                  <th className="text-right p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Date</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => {
                  const c = (a as { candidates?: { name?: string; stage?: string } }).candidates
                  return (
                    <tr key={a.id} className="border-b border-border last:border-b-0">
                      <td className="p-3">{c?.name ?? "Unknown"}</td>
                      <td className="p-3 capitalize text-muted-foreground">{c?.stage ?? "-"}</td>
                      <td className="p-3 capitalize">{a.decision || "—"}</td>
                      <td className="p-3 text-right font-mono">{Math.round(Number(a.final_score) || 0)}</td>
                      <td className="p-3 text-right text-muted-foreground text-xs">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function DistributionCell({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="border border-border p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground capitalize">{label}</div>
      <div className="mt-2 font-mono text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{pct}%</div>
      <div className="mt-3 h-1 bg-muted">
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
