import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { Card, EmptyState, ScoreBadge } from "@/components/app/primitives"

const STAGES = [
  { key: "applied", label: "Applied" },
  { key: "screened", label: "Screened" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
  { key: "rejected", label: "Rejected" },
] as const

export default async function PipelinePage() {
  const supabase = await createClient()

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, score, stage, skills")
    .order("score", { ascending: false })

  const list = candidates ?? []
  const grouped = STAGES.reduce<Record<string, typeof list>>((acc, s) => {
    acc[s.key] = []
    return acc
  }, {})
  for (const c of list) {
    const s = (c.stage ?? "applied").toLowerCase()
    if (s in grouped) grouped[s].push(c)
  }

  if (list.length === 0) {
    return (
      <div>
        <PageHeader title="Pipeline" subtitle="Kanban view of every candidate" />
        <EmptyState
          title="Pipeline is empty"
          description="Upload a resume to begin — candidates will appear in the right stage automatically."
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
    )
  }

  return (
    <div>
      <PageHeader title="Pipeline" subtitle="Kanban view of every candidate" />

      <div className="overflow-x-auto -mx-6 md:-mx-8 px-6 md:px-8">
        <div className="flex gap-4 min-w-max pb-4">
          {STAGES.map((stage) => {
            const items = grouped[stage.key]
            return (
              <div key={stage.key} className="w-72 shrink-0 flex flex-col gap-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-[11px] font-mono uppercase tracking-widest text-foreground">
                    {stage.label}
                  </h3>
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2 min-h-[200px]">
                  {items.length === 0 ? (
                    <div className="border border-dashed border-border rounded-lg p-6 text-center text-[11px] font-mono text-muted-foreground">
                      Empty
                    </div>
                  ) : (
                    items.map((c) => {
                      const skills: string[] = (c.skills ?? []).slice(0, 2)
                      return (
                        <Link
                          key={c.id}
                          href={`/candidates/${c.id}`}
                          className="block"
                        >
                          <Card className="p-3.5 hover:border-foreground/40 transition-colors">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-sm text-foreground truncate">{c.name}</span>
                              <ScoreBadge score={Number(c.score ?? 0)} />
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {skills.length === 0 ? (
                                <span className="text-[10px] font-mono text-muted-foreground">
                                  no skills
                                </span>
                              ) : (
                                skills.map((s) => (
                                  <span
                                    key={s}
                                    className="text-[10px] font-mono text-muted-foreground border border-border rounded-full px-1.5 py-0.5"
                                  >
                                    {s}
                                  </span>
                                ))
                              )}
                            </div>
                          </Card>
                        </Link>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
