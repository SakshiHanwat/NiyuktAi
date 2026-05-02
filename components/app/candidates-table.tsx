"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Card, ScoreBadge, SkillPill, StageBadge } from "@/components/app/primitives"
import { ChevronDown } from "lucide-react"

type Candidate = {
  id: string
  name: string
  email: string | null
  score: number | null
  stage: string | null
  skills: string[] | null
  created_at: string
  job_id: string | null
}

const STAGE_OPTIONS = [
  "all",
  "applied",
  "screened",
  "shortlisted",
  "interview",
  "offer",
  "rejected",
] as const

type SortKey = "score" | "name" | "date"

export function CandidatesTable({ candidates }: { candidates: Candidate[] }) {
  const [stageFilter, setStageFilter] = useState<(typeof STAGE_OPTIONS)[number]>("all")
  const [sortKey, setSortKey] = useState<SortKey>("score")

  const filtered = useMemo(() => {
    let list = candidates
    if (stageFilter !== "all") {
      list = list.filter((c) => (c.stage ?? "applied").toLowerCase() === stageFilter)
    }
    list = [...list].sort((a, b) => {
      if (sortKey === "score") return Number(b.score ?? 0) - Number(a.score ?? 0)
      if (sortKey === "name") return a.name.localeCompare(b.name)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return list
  }, [candidates, stageFilter, sortKey])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <SelectControl
          label="Stage"
          value={stageFilter}
          onChange={(v) => setStageFilter(v as (typeof STAGE_OPTIONS)[number])}
          options={STAGE_OPTIONS.map((s) => ({ value: s, label: s === "all" ? "All stages" : s }))}
        />
        <SelectControl
          label="Sort by"
          value={sortKey}
          onChange={(v) => setSortKey(v as SortKey)}
          options={[
            { value: "score", label: "Score (high → low)" },
            { value: "name", label: "Name (A → Z)" },
            { value: "date", label: "Date added" },
          ]}
        />
        <span className="text-[11px] font-mono text-muted-foreground ml-auto">
          {filtered.length} {filtered.length === 1 ? "result" : "results"}
        </span>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_80px_120px_1fr_100px] gap-4 px-5 py-3 border-b border-border text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          <span>Name</span>
          <span>Email</span>
          <span>Score</span>
          <span>Stage</span>
          <span>Skills</span>
          <span className="text-right">Date</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs font-mono text-muted-foreground">
            No candidates match this filter.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((c) => {
              const skills = (c.skills ?? []).slice(0, 3)
              return (
                <Link
                  key={c.id}
                  href={`/candidates/${c.id}`}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_80px_120px_1fr_100px] gap-2 md:gap-4 px-5 py-4 hover:bg-muted/50 transition-colors items-center"
                >
                  <span className="text-sm text-foreground truncate">{c.name}</span>
                  <span className="text-xs font-mono text-muted-foreground truncate">
                    {c.email ?? "—"}
                  </span>
                  <ScoreBadge score={Number(c.score ?? 0)} />
                  <div>
                    <StageBadge stage={c.stage} />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.length === 0 ? (
                      <span className="text-[11px] font-mono text-muted-foreground">—</span>
                    ) : (
                      skills.map((s) => <SkillPill key={s}>{s}</SkillPill>)
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-muted-foreground md:text-right">
                    {formatDate(c.created_at)}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}

function SelectControl({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="relative inline-flex items-center gap-2 bg-card border border-border rounded-md pl-3 pr-2 py-1.5 text-xs">
      <span className="font-mono uppercase tracking-wider text-muted-foreground text-[10px]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent text-foreground text-xs font-mono pr-5 focus:outline-none appearance-none capitalize"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card text-foreground">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 text-muted-foreground absolute right-2 pointer-events-none" />
    </label>
  )
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return ""
  }
}
