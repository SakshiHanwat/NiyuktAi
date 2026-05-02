import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { EmailAssistant } from "@/components/app/email-assistant"

export default async function EmailsPage() {
  const supabase = await createClient()

  const [{ data: candidates }, { data: emailLogs }] = await Promise.all([
    supabase.from("candidates").select("id, name, email").order("created_at", { ascending: false }),
    supabase
      .from("email_logs")
      .select("id, candidate_id, type, subject, status, sent_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  return (
    <div>
      <PageHeader
        title="Email Assistant"
        subtitle="Draft and send candidate emails with AI"
      />
      <EmailAssistant
        candidates={candidates ?? []}
        recentEmails={emailLogs ?? []}
      />
    </div>
  )
}
