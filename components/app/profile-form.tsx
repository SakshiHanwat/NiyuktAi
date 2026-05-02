"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function ProfileForm({
  userId,
  initialEmail,
  initialFullName,
}: {
  userId: string
  initialEmail: string
  initialFullName: string
}) {
  const [fullName, setFullName] = useState(initialFullName)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    const supabase = createClient()
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", userId)
    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage("Saved.")
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-5">
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Email</label>
        <input
          type="email"
          value={initialEmail}
          disabled
          className="w-full bg-muted/30 border border-border px-3 py-2 text-sm text-muted-foreground"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Full name</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:border-foreground"
        />
      </div>

      {error ? <div className="text-sm text-foreground">{error}</div> : null}
      {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}

      <button
        type="submit"
        disabled={saving}
        className="bg-foreground text-background px-4 py-2 text-sm uppercase tracking-wider disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save profile"}
      </button>
    </form>
  )
}
