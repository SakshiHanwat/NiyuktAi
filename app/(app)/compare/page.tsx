import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState } from "@/components/app/primitives"
import { CompareTool } from "@/components/app/compare-tool"
import Link from "next/link"

export default async function ComparePage() {
  const supabase = await createClient()
  const { data: candidates } = await supabase
    .from("candidates")
    .select("id, name, email, score, stage, skills, experience_years")
    .order("score", { ascending: false })

  const list = candidates ?? []

  return (
    <div>
      <PageHeader title="Compare" subtitle="Side-by-side candidate analysis" />
      {list.length < 2 ? (
        <EmptyState
          title="Need at least 2 candidates"
          description="Upload more resumes to start comparing candidates side-by-side."
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
        <CompareTool candidates={list} />
      )}
    </div>
  )
}
