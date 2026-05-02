"use client"

import { useMemo, useState } from "react"
import { Card, ScoreBadge, SkillPill, StageBadge } from "@/components/app/primitives"
import { Sparkles } from "lucide-react"

type Candidate = {
  id: string
  name: string
  email: string | null
  score: number | null
  stage: string | null
  skills: string[] | null
  experience_years: number | null
}

export function CompareTool({ candidates }: { candidates: Candidate[] }) {
  const [leftId, setLeftId] = useState<string>(candidates[0]?.id ?? "")
  const [rightId, setRightId] = useState<string>(candidates[1]?.id ?? "")

  const left = useMemo(() => candidates.find((c) => c.id === leftId) ?? null, [candidates, leftId])
  const right = useMemo(() => candidates.find((c) => c.id === rightId) ?? null, [candidates, rightId])

  const [recommendation, setRecommendation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRecommend = async () => {
    if (!left || !right) return
    setError(null)
    setRecommendation(null)
    setLoading(true)
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_a: left.id, candidate_b: right.id }),
      })
      if (!res.ok) throw new Error(`Compare failed (${res.status})`)
      const data = await res.json().catch(() => ({}))
      setRecommendation(data?.recommendation ?? data?.text ?? "No recommendation returned.")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not generate recommendation")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <CandidatePicker
          label="Candidate A"
          value={leftId}
          onChange={setLeftId}
          options={candidates}
        />
        <CandidatePicker
          label="Candidate B"
          value={rightId}
          onChange={setRightId}
          options={candidates}
        />
      </div>

      {/* Comparison table */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-3 border-b border-border bg-muted/30">
          <div className="px-5 py-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Attribute
          </div>
          <div className="px-5 py-3 text-sm text-foreground border-l border-border">
            {left?.name ?? "—"}
          </div>
          <div className="px-5 py-3 text-sm text-foreground border-l border-border">
            {right?.name ?? "—"}
          </div>
        </div>

        <Row label="Score">
          <ScoreBadge score={Number(left?.score ?? 0)} />
          <ScoreBadge score={Number(right?.score ?? 0)} />
        </Row>

        <Row label="Stage">
          <StageBadge stage={left?.stage} />
          <StageBadge stage={right?.stage} />
        </Row>

        <Row label="Experience">
          <span className="text-xs font-mono text-foreground">
            {left?.experience_years != null ? `${left.experience_years} yrs` : "—"}
          </span>
          <span className="text-xs font-mono text-foreground">
            {right?.experience_years != null ? `${right.experience_years} yrs` : "—"}
          </span>
        </Row>

        <Row label="Email">
          <span className="text-xs font-mono text-muted-foreground truncate">{left?.email ?? "—"}</span>
          <span className="text-xs font-mono text-muted-foreground truncate">{right?.email ?? "—"}</span>
        </Row>

        <Row label="Skills" alignTop>
          <SkillsCell skills={left?.skills ?? []} />
          <SkillsCell skills={right?.skills ?? []} />
        </Row>
      </Card>

      {/* AI Recommendation */}
      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AI Recommendation
            </h2>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">
              Generate a side-by-side analysis and a hiring suggestion.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecommend}
            disabled={loading || !left || !right || left.id === right.id}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? "Analyzing..." : "Generate"}
          </button>
        </div>

        {error && (
          <div className="text-xs font-mono text-foreground bg-muted border border-border rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {recommendation ? (
          <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {recommendation}
          </div>
        ) : (
          !error && (
            <p className="text-xs font-mono text-muted-foreground">
              Click Generate to compare these candidates with the recommendation engine.
            </p>
          )
        )}
      </Card>
    </div>
  )
}

function Row({
  label,
  children,
  alignTop,
}: {
  label: string
  children: React.ReactNode
  alignTop?: boolean
}) {
  return (
    <div className={`grid grid-cols-3 border-b border-border last:border-b-0 ${alignTop ? "items-start" : "items-center"}`}>
      <div className="px-5 py-4 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="px-5 py-4 border-l border-border">
        {Array.isArray(children) ? children[0] : children}
      </div>
      <div className="px-5 py-4 border-l border-border">
        {Array.isArray(children) ? children[1] : null}
      </div>
    </div>
  )
}

function SkillsCell({ skills }: { skills: string[] }) {
  if (skills.length === 0) {
    return <span className="text-[11px] font-mono text-muted-foreground">No skills</span>
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.slice(0, 8).map((s) => (
        <SkillPill key={s}>{s}</SkillPill>
      ))}
    </div>
  )
}

function CandidatePicker({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Candidate[]
}) {
  return (
    <Card className="p-4">
      <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-input border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-foreground transition-colors"
      >
        <option value="" className="bg-card">
          Select a candidate
        </option>
        {options.map((c) => (
          <option key={c.id} value={c.id} className="bg-card text-foreground">
            {c.name} · {Math.round(Number(c.score ?? 0))}
          </option>
        ))}
      </select>
    </Card>
  )
}
