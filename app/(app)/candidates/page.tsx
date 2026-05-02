import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState } from "@/components/app/primitives"
import { CandidatesTable } from "@/components/app/candidates-table"
import Link from "next/link"

export default async function CandidatesPage() {
  const supabase = await createClient()

  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, email, score, stage, skills, created_at, job_id")
    .order("score", { ascending: false })

  const list = candidates ?? []

  return (
    <div>
      <PageHeader title="Candidates" subtitle="All candidates in your workspace" />

      {list.length === 0 ? (
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
      ) : (
        <CandidatesTable candidates={list} />
      )}
    </div>
  )
}
