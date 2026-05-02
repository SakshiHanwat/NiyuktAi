"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Bot } from "lucide-react"

const STAGES = ["applied", "screened", "shortlisted", "interview", "offer", "rejected"]

export function CandidateActions({
  candidateId,
  jobId,
  currentStage,
}: {
  candidateId: string
  jobId: string | null
  currentStage: string
}) {
  const router = useRouter()
  const [stage, setStage] = useState(currentStage)
  const [updating, setUpdating] = useState(false)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStageChange = async (next: string) => {
    setError(null)
    setStage(next)
    setUpdating(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("candidates")
        .update({ stage: next })
        .eq("id", candidateId)
      if (error) throw error
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update stage")
      setStage(currentStage)
    } finally {
      setUpdating(false)
    }
  }

  const handleRunAgent = async () => {
    setError(null)
    setRunning(true)
    try {
      const res = await fetch("/api/autonomous-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_id: candidateId, job_id: jobId }),
      })
      if (!res.ok) {
        throw new Error(`Agent failed (${res.status})`)
      }
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to run agent")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 bg-muted border border-border rounded-md px-3 py-1.5 text-xs">
          <span className="font-mono uppercase tracking-wider text-muted-foreground text-[10px]">
            Stage
          </span>
          <select
            value={stage}
            onChange={(e) => handleStageChange(e.target.value)}
            disabled={updating}
            className="bg-transparent text-foreground text-xs font-mono focus:outline-none capitalize disabled:opacity-50"
          >
            {STAGES.map((s) => (
              <option key={s} value={s} className="bg-card text-foreground">
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleRunAgent}
          disabled={running}
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Bot className="w-3.5 h-3.5" />
          {running ? "Running agent..." : "Run Autonomous Agent"}
        </button>
      </div>
      {error && (
        <span className="text-[11px] font-mono text-muted-foreground">{error}</span>
      )}
    </div>
  )
}
