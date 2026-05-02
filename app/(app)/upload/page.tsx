import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { UploadResume } from "@/components/app/upload-resume"

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, department")
    .order("created_at", { ascending: false })

  return (
    <div>
      <PageHeader
        title="Upload Resume"
        subtitle="Drop a PDF — agent will parse, score, and decide automatically"
      />
      <UploadResume jobs={jobs ?? []} />
    </div>
  )
}
