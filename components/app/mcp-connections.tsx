"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

type Conn = {
  id: string
  service: string
  status: string
  server_url: string | null
  updated_at: string
}

const SERVICES: { key: string; label: string; description: string }[] = [
  { key: "gmail", label: "Gmail", description: "Send candidate emails directly from agents." },
  { key: "calendar", label: "Calendar", description: "Schedule and reschedule interviews automatically." },
  { key: "slack", label: "Slack", description: "Push pipeline notifications to a hiring channel." },
]

export function McpConnections({
  userId,
  initial,
}: {
  userId: string
  initial: Conn[]
}) {
  const [conns, setConns] = useState<Conn[]>(initial)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggle(service: string) {
    setBusy(service)
    setError(null)
    const supabase = createClient()
    const existing = conns.find((c) => c.service === service)
    if (existing) {
      const newStatus = existing.status === "connected" ? "disconnected" : "connected"
      const { data, error } = await supabase
        .from("mcp_connections")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select()
        .single()
      if (error) setError(error.message)
      else if (data) {
        setConns((prev) => prev.map((c) => (c.id === existing.id ? (data as Conn) : c)))
      }
    } else {
      const { data, error } = await supabase
        .from("mcp_connections")
        .insert({ user_id: userId, service, status: "connected" })
        .select()
        .single()
      if (error) setError(error.message)
      else if (data) {
        setConns((prev) => [...prev, data as Conn])
      }
    }
    setBusy(null)
  }

  return (
    <div className="space-y-3">
      {error ? <div className="text-sm text-foreground border border-border p-3">{error}</div> : null}
      {SERVICES.map((s) => {
        const c = conns.find((x) => x.service === s.key)
        const connected = c?.status === "connected"
        return (
          <div key={s.key} className="border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.description}</div>
            </div>
            <button
              onClick={() => toggle(s.key)}
              disabled={busy === s.key}
              className={
                "text-xs uppercase tracking-wider px-3 py-2 border disabled:opacity-50 " +
                (connected
                  ? "border-foreground text-foreground"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground")
              }
            >
              {busy === s.key ? "..." : connected ? "Disconnect" : "Connect"}
            </button>
          </div>
        )
      })}
    </div>
  )
}
