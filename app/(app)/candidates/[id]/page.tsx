import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/app/page-header"
import { Card, SkillPill } from "@/components/app/primitives"
import { CandidateActions } from "@/components/app/candidate-actions"
import { ScoreBars } from "@/components/app/score-bars"
import { Mail, Phone, MapPin, GraduationCap, Briefcase } from "lucide-react"

export default async function CandidateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: candidate, error } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !candidate) {
    notFound()
  }

  const { data: analysis } = await supabase
    .from("ai_analysis")
    .select("*")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: agentLogs } = await supabase
    .from("agent_logs")
    .select("id, step, status, result, created_at")
    .eq("candidate_id", id)
    .order("created_at", { ascending: false })
    .limit(20)

  const skills: string[] = candidate.skills ?? []
  const skillGaps: string[] = analysis?.skill_gaps ?? []
  const interviewQuestions: { question: string }[] | string[] = analysis?.interview_questions ?? []

  const score = Number(candidate.score ?? analysis?.final_score ?? 0)

  return (
    <div>
      <PageHeader title={candidate.name} subtitle={candidate.email ?? ""} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Score block */}
          <Card className="p-6">
            <div className="flex items-end justify-between gap-6 flex-wrap">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mb-3">
                  Overall Score
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl font-mono leading-none text-foreground">
                    {Math.round(score)}
                  </span>
                  <span className="text-2xl font-mono text-muted-foreground">/100</span>
                </div>
                {analysis?.decision && (
                  <p className="mt-3 text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Decision: <span className="text-foreground">{analysis.decision}</span>
                  </p>
                )}
              </div>
              <CandidateActions
                candidateId={candidate.id}
                jobId={candidate.job_id}
                currentStage={candidate.stage ?? "applied"}
              />
            </div>
          </Card>

          {/* Score breakdown */}
          <Card className="p-6">
            <h2 className="text-sm font-medium text-foreground mb-5">AI Score Breakdown</h2>
            <ScoreBars
              skillsMatch={Number(analysis?.skills_match ?? 0)}
              experience={Number(analysis?.experience_score ?? 0)}
              projects={Number(analysis?.projects_score ?? 0)}
              education={Number(analysis?.education_score ?? 0)}
              relevance={Number(analysis?.relevance_score ?? 0)}
            />
          </Card>

          {/* Skills */}
          <Card className="p-6">
            <h2 className="text-sm font-medium text-foreground mb-4">Skills</h2>
            {skills.length === 0 ? (
              <p className="text-xs font-mono text-muted-foreground">No skills extracted yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <SkillPill key={s}>{s}</SkillPill>
                ))}
              </div>
            )}

            {skillGaps.length > 0 && (
              <>
                <h3 className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground mt-6 mb-3">
                  Skill Gaps
                </h3>
                <div className="flex flex-wrap gap-2">
                  {skillGaps.map((g) => (
                    <SkillPill key={g} variant="dashed">
                      {g}
                    </SkillPill>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* Interview questions */}
          {interviewQuestions.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-medium text-foreground mb-4">Interview Questions</h2>
              <ol className="flex flex-col gap-3">
                {interviewQuestions.map((q, idx) => {
                  const text = typeof q === "string" ? q : q.question
                  return (
                    <li
                      key={idx}
                      className="flex gap-3 items-start text-sm font-mono text-foreground"
                    >
                      <span className="text-muted-foreground shrink-0 w-6">
                        {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-foreground/90 leading-relaxed">{text}</span>
                    </li>
                  )
                })}
              </ol>
            </Card>
          )}

          {/* Agent log */}
          <Card className="p-6">
            <h2 className="text-sm font-medium text-foreground mb-4">Agent Activity</h2>
            {(!agentLogs || agentLogs.length === 0) ? (
              <p className="text-xs font-mono text-muted-foreground">
                No agent activity yet. Run the autonomous agent to see live steps here.
              </p>
            ) : (
              <ol className="flex flex-col gap-2">
                {agentLogs.map((log, idx) => (
                  <li
                    key={log.id}
                    className="flex items-center gap-3 text-xs font-mono animate-fade-up"
                    style={{ animationDelay: `${idx * 0.04}s` }}
                  >
                    <span className="w-1 h-1 rounded-full bg-foreground" />
                    <span className="text-foreground">{log.step}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground uppercase tracking-wider">
                      {log.status}
                    </span>
                    <span className="text-muted-foreground/60 ml-auto">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        {/* Right column — profile */}
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h2 className="text-sm font-medium text-foreground mb-4">Profile</h2>
            <div className="flex flex-col gap-3 text-xs font-mono">
              {candidate.email && (
                <InfoRow icon={Mail}>{candidate.email}</InfoRow>
              )}
              {candidate.phone && (
                <InfoRow icon={Phone}>{candidate.phone}</InfoRow>
              )}
              {candidate.location && (
                <InfoRow icon={MapPin}>{candidate.location}</InfoRow>
              )}
              {candidate.experience_years != null && (
                <InfoRow icon={Briefcase}>{candidate.experience_years} years experience</InfoRow>
              )}
              {candidate.education && (
                <InfoRow icon={GraduationCap}>{candidate.education}</InfoRow>
              )}
            </div>
          </Card>

          {candidate.summary && (
            <Card className="p-6">
              <h2 className="text-sm font-medium text-foreground mb-3">Summary</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{candidate.summary}</p>
            </Card>
          )}

          {analysis?.strengths && analysis.strengths.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-medium text-foreground mb-3">Strengths</h2>
              <ul className="flex flex-col gap-2">
                {analysis.strengths.map((s: string, i: number) => (
                  <li key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">
                    — {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {analysis?.weaknesses && analysis.weaknesses.length > 0 && (
            <Card className="p-6">
              <h2 className="text-sm font-medium text-foreground mb-3">Weaknesses</h2>
              <ul className="flex flex-col gap-2">
                {analysis.weaknesses.map((s: string, i: number) => (
                  <li key={i} className="text-xs font-mono text-muted-foreground leading-relaxed">
                    — {s}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2.5 text-foreground">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="truncate">{children}</span>
    </div>
  )
}
