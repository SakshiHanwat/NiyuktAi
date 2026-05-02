type Props = {
  skillsMatch: number
  experience: number
  projects: number
  education: number
  relevance: number
}

const ROWS: { key: keyof Props; label: string; weight: string }[] = [
  { key: "skillsMatch", label: "Skills Match", weight: "35%" },
  { key: "experience", label: "Experience", weight: "25%" },
  { key: "projects", label: "Projects", weight: "20%" },
  { key: "education", label: "Education", weight: "10%" },
  { key: "relevance", label: "Relevance", weight: "10%" },
]

export function ScoreBars(props: Props) {
  return (
    <div className="flex flex-col gap-4">
      {ROWS.map((row) => {
        const value = Math.max(0, Math.min(100, Math.round(props[row.key] || 0)))
        return (
          <div key={row.key} className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-foreground">{row.label}</span>
              <span className="flex items-center gap-3">
                <span className="text-muted-foreground">weight {row.weight}</span>
                <span className="text-foreground tabular-nums">{value}</span>
              </span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground transition-all duration-700"
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
