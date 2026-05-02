"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/app/primitives"
import { Mail, Send, Sparkles } from "lucide-react"

type Candidate = { id: string; name: string; email: string | null }
type EmailLog = {
  id: string
  candidate_id: string
  type: string | null
  subject: string | null
  status: string | null
  sent_at: string | null
  created_at: string
}

const TEMPLATES = [
  { key: "shortlist", label: "Shortlist", description: "Confirm next steps" },
  { key: "interview", label: "Interview Invite", description: "Propose times to chat" },
  { key: "rejection", label: "Polite Rejection", description: "Close the loop kindly" },
  { key: "offer", label: "Offer Letter", description: "Send the good news" },
] as const

type TemplateKey = (typeof TEMPLATES)[number]["key"]

export function EmailAssistant({
  candidates,
  recentEmails,
}: {
  candidates: Candidate[]
  recentEmails: EmailLog[]
}) {
  const [template, setTemplate] = useState<TemplateKey>("shortlist")
  const [candidateId, setCandidateId] = useState<string>("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentInfo, setSentInfo] = useState<string | null>(null)

  const candidate = useMemo(
    () => candidates.find((c) => c.id === candidateId) ?? null,
    [candidates, candidateId]
  )

  const candidateById = useMemo(() => {
    const map = new Map<string, Candidate>()
    candidates.forEach((c) => map.set(c.id, c))
    return map
  }, [candidates])

  const handleDraft = async () => {
    if (!candidateId) {
      setError("Choose a candidate first.")
      return
    }
    setError(null)
    setSentInfo(null)
    setDrafting(true)
    try {
      const res = await fetch("/api/draft-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId, type: template }),
      })
      if (!res.ok) throw new Error(`Draft failed (${res.status})`)
      const data = await res.json().catch(() => ({}))
      const email = data?.email ?? data
      setSubject(email?.subject ?? "")
      setBody(email?.body ?? "")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not generate draft")
    } finally {
      setDrafting(false)
    }
  }

  const handleSend = async () => {
    if (!candidateId || !subject.trim() || !body.trim()) {
      setError("Candidate, subject, and body are required.")
      return
    }
    if (!candidate?.email) {
      setError("This candidate has no email address.")
      return
    }
    setError(null)
    setSentInfo(null)
    setSending(true)
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidate_id: candidateId,
          to: candidate.email,
          subject,
          email_body: body,
          type: template,
        }),
      })
      if (!res.ok) throw new Error(`Send failed (${res.status})`)
      const data = await res.json().catch(() => ({}))
      setSentInfo(data?.message ?? "Email sent successfully!")
      setSubject("")
      setBody("")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not send email")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr_280px] gap-6">
      {/* Templates */}
      <Card className="p-4 h-fit">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
          Templates
        </h3>
        <div className="flex flex-col gap-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTemplate(t.key)}
              className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-md text-left transition-colors ${
                template === t.key
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <span className="text-sm">{t.label}</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {t.description}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Editor */}
      <Card className="p-5">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground pt-2">
              To
            </span>
            <select
              value={candidateId}
              onChange={(e) => setCandidateId(e.target.value)}
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
            >
              <option value="" className="bg-card">
                Select a candidate
              </option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id} className="bg-card text-foreground">
                  {c.name} {c.email ? `<${c.email}>` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground pt-2">
              Subject
            </span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line"
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] items-start gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground pt-2">
              Body
            </span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="Write or generate the email body..."
              className="bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors resize-y leading-relaxed"
            />
          </div>

          {error && (
            <div className="text-xs font-mono text-foreground bg-muted border border-border rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {sentInfo && (
            <div className="text-xs font-mono text-green-400 bg-muted border border-border rounded-md px-3 py-2">
              ✓ {sentInfo}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDraft}
              disabled={drafting || !candidateId}
              className="inline-flex items-center gap-1.5 border border-border text-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {drafting ? "Drafting..." : "Generate Draft"}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || !candidateId || !subject.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? "Sending..." : "Send via Gmail"}
            </button>
            {candidate?.email && (
              <span className="text-[11px] font-mono text-muted-foreground ml-auto">
                Sending to <span className="text-foreground">{candidate.email}</span>
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Recent emails */}
      <Card className="p-4 h-fit">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
          <Mail className="w-3 h-3" />
          Recent
        </h3>
        {recentEmails.length === 0 ? (
          <p className="text-[11px] font-mono text-muted-foreground py-4 text-center">
            No emails sent yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {recentEmails.map((e) => {
              const c = candidateById.get(e.candidate_id)
              return (
                <li
                  key={e.id}
                  className="flex flex-col gap-0.5 border-b border-border pb-3 last:border-b-0 last:pb-0"
                >
                  <span className="text-xs text-foreground truncate">
                    {e.subject ?? "(no subject)"}
                  </span>
                  <span className="text-[11px] font-mono text-muted-foreground truncate">
                    {c?.name ?? "Unknown"} · {e.status ?? "draft"}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}