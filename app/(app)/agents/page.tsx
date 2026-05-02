import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState } from "@/components/app/primitives"

const AGENTS = [
  {
    key: "parser",
    name: "Resume Parser",
    description: "Extracts structured data from uploaded resumes — name, experience, skills, projects.",
  },
  {
    key: "scorer",
    name: "Candidate Scorer",
    description: "Computes a weighted final score across skills, experience, projects, education and relevance.",
  },
  {
    key: "matcher",
    name: "Job Matcher",
    description: "Pairs candidates to open roles based on skills overlap and experience fit.",
  },
  {
    key: "writer",
    name: "Email Writer",
    description: "Drafts personalised outreach: shortlist, interview invite, rejection, offer.",
  },
  {
    key: "auditor",
    name: "Bias Auditor",
    description: "Watches for skewed score and decision distributions across the funnel.",
  },
]

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <ErrorState message="Not authenticated" />

  const { data: logs, error } = await supabase
    .from("agent_logs")
    .select("id, candidate_id, step, status, result, created_at, candidates!inner(name, user_id)")
    .eq("candidates.user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(60)

  if (error) {
    return (
      <div className="p-8">
        <ErrorState message={error.message} />
      </div>
    )
  }

  const list = logs ?? []

  // Step counts for status board
  const stepCounts = list.reduce<Record<string, { total: number; success: number; failed: number; running: number }>>(
    (acc, l) => {
      const k = l.step || "unknown"
      if (!acc[k]) acc[k] = { total: 0, success: 0, failed: 0, running: 0 }
      acc[k].total++
      if (l.status === "success") acc[k].success++
      else if (l.status === "failed") acc[k].failed++
      else if (l.status === "running") acc[k].running++
      return acc
    },
    {},
  )

  return (
    <div className="p-8 space-y-8">
      <PageHeader
        title="Autonomous Agents"
        subtitle="Specialised AI workers that move candidates through the pipeline without your input."
      />

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Active agents</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AGENTS.map((a) => {
            const counts = stepCounts[a.key] || { total: 0, success: 0, failed: 0, running: 0 }
            const status = counts.running > 0 ? "running" : counts.failed > 0 ? "attention" : "idle"
            return (
              <div key={a.key} className="border border-border bg-card p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium text-base">{a.name}</div>
                    <div className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.description}</div>
                  </div>
                  <span
                    className={
                      "text-xs uppercase tracking-wider px-2 py-1 border " +
                      (status === "running"
                        ? "border-foreground text-foreground"
                        : status === "attention"
                        ? "border-foreground/60 text-foreground/80"
                        : "border-border text-muted-foreground")
                    }
                  >
                    {status}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <Cell label="Runs" value={counts.total} />
                  <Cell label="Success" value={counts.success} />
                  <Cell label="Failed" value={counts.failed} />
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-3">Activity feed</h2>
        {list.length === 0 ? (
          <EmptyState
            title="No agent activity yet"
            description="Agent runs will appear here once you upload a resume or analyse a candidate."
          />
        ) : (
          <div className="border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Agent</th>
                  <th className="text-left p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Candidate</th>
                  <th className="text-left p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">Status</th>
                  <th className="text-right p-3 font-normal text-muted-foreground uppercase tracking-wider text-xs">When</th>
                </tr>
              </thead>
              <tbody>
                {list.map((l) => {
                  const c = (l as { candidates?: { name?: string } }).candidates
                  return (
                    <tr key={l.id} className="border-b border-border last:border-b-0">
                      <td className="p-3 capitalize">{l.step || "—"}</td>
                      <td className="p-3 text-muted-foreground">{c?.name ?? "—"}</td>
                      <td className="p-3 capitalize">{l.status || "—"}</td>
                      <td className="p-3 text-right text-muted-foreground text-xs">
                        {new Date(l.created_at).toLocaleString()}
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

function Cell({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-mono text-sm">{value}</div>
    </div>
  )
}
