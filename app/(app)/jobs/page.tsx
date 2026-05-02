import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { Card, EmptyState } from "@/components/app/primitives"
import { Plus, MapPin, Briefcase } from "lucide-react"

export default async function JobsPage() {
  const supabase = await createClient()

  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, department, location, job_type, status, created_at")
    .order("created_at", { ascending: false })

  // Count candidates per job in one query
  const { data: candidates } = await supabase.from("candidates").select("job_id")
  const countByJob = new Map<string, number>()
  for (const row of candidates ?? []) {
    if (!row.job_id) continue
    countByJob.set(row.job_id, (countByJob.get(row.job_id) ?? 0) + 1)
  }

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Open positions in your workspace"
        actions={
          <Link
            href="/jobs/new"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Job
          </Link>
        }
      />

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          title="No jobs yet"
          description="Post your first job to start collecting candidates and running the agent."
          action={
            <Link
              href="/jobs/new"
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Post a job
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const count = countByJob.get(job.id) ?? 0
            return (
              <Card
                key={job.id}
                className="p-5 hover:border-foreground/30 transition-colors flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground leading-snug">{job.title}</h3>
                  <span
                    className={
                      "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider " +
                      (job.status === "active"
                        ? "border border-foreground text-foreground"
                        : "border border-border text-muted-foreground")
                    }
                  >
                    {job.status ?? "active"}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 text-xs font-mono text-muted-foreground">
                  {job.department && (
                    <span className="flex items-center gap-1.5">
                      <Briefcase className="w-3 h-3" />
                      {job.department}
                    </span>
                  )}
                  {job.location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" />
                      {job.location}
                    </span>
                  )}
                  {job.job_type && (
                    <span className="text-muted-foreground">{job.job_type}</span>
                  )}
                </div>
                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    {count} {count === 1 ? "candidate" : "candidates"}
                  </span>
                  <Link
                    href={`/candidates?job=${job.id}`}
                    className="text-[11px] font-mono text-foreground hover:underline"
                  >
                    View →
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
