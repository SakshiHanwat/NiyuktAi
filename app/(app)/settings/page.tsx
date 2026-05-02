import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { ErrorState } from "@/components/app/primitives"
import { ProfileForm } from "@/components/app/profile-form"
import { McpConnections } from "@/components/app/mcp-connections"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return <ErrorState message="Not authenticated" />

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", user.id)
    .single()

  const { data: connections } = await supabase
    .from("mcp_connections")
    .select("id, service, status, server_url, updated_at")
    .eq("user_id", user.id)

  return (
    <div className="p-8 space-y-10 max-w-3xl">
      <PageHeader
        title="Settings"
        subtitle="Your profile, integrations, and connected agents."
      />

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">Profile</h2>
        <ProfileForm
          userId={user.id}
          initialEmail={profile?.email ?? user.email ?? ""}
          initialFullName={profile?.full_name ?? ""}
        />
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-4">
          MCP Integrations
        </h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          Connect external services so agents can read and write on your behalf — Gmail for sending email, Calendar for scheduling interviews, Slack for notifying your team.
        </p>
        <McpConnections userId={user.id} initial={connections ?? []} />
      </section>
    </div>
  )
}
