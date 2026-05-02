import { generateJson, gemini, isAiEnabled } from "./groq";
import { createClient } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedCandidate {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  experience_years: number;
  education: string;
  skills: string[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
  }[];
}

export interface ScoringResult {
  final_score: number;
  skills_match: number;
  experience_score: number;
  projects_score: number;
  education_score: number;
  relevance_score: number;
  matched_skills: string[];
  skill_gaps: string[];
  analysis: string;
  reasoning: string;
  decision: "shortlist" | "hold" | "reject";
  strengths: string[];
  weaknesses: string[];
  next_action: string;
  interview_questions: { question: string; category: string }[];
}

export interface AgentResult {
  success: boolean;
  candidate_id: string;
  job_id?: string;
  parsed: ParsedCandidate;
  scoring?: ScoringResult;
  email?: {
    subject: string;
    body: string;
    type: string;
  };
  steps: AgentStep[];
  error?: string;
}

interface AgentStep {
  step: string;
  status: "success" | "failed" | "skipped";
  result?: Record<string, unknown>;
  error?: string;
}

// ─── Supabase server client (service role for agent) ──────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── 1. Resume Parser ─────────────────────────────────────────────────────────

export async function parseResumeWithAI(resumeText: string): Promise<ParsedCandidate> {
  if (!isAiEnabled()) {
    throw new Error("AI is not enabled. Please set GROQ_API_KEY.");
  }

  const prompt = `
Extract all information from the following resume text and return it as a structured JSON object.

RESUME TEXT:
"""
${resumeText}
"""

Return ONLY a valid JSON object (no markdown, no fences) with this exact structure:
{
  "name": "Full name of candidate",
  "email": "email@example.com",
  "phone": "+91XXXXXXXXXX",
  "location": "City, State/Country",
  "summary": "2-3 sentence professional summary",
  "experience_years": 0,
  "education": "Highest degree, Institution, Year",
  "skills": ["skill1", "skill2", "skill3"],
  "projects": [
    {
      "name": "Project Name",
      "description": "What it does in 1-2 sentences",
      "technologies": ["tech1", "tech2"]
    }
  ]
}

Rules:
- experience_years: total years of work experience as a number (0 if fresher)
- skills: extract ALL technical and soft skills mentioned
- projects: include all projects, internships, and significant coursework
- If any field is not found, use empty string "" or empty array []
- Never return null for any field
`;

  return generateJson<ParsedCandidate>(prompt);
}

// ─── 2. Candidate Scorer ──────────────────────────────────────────────────────

export async function scoreCandidate(
  parsed: ParsedCandidate,
  job: {
    title: string;
    description: string;
    experience_required: number;
    department?: string;
    location?: string;
  }
): Promise<ScoringResult> {
  if (!isAiEnabled()) {
    throw new Error("AI is not enabled. Please set GROQ_API_KEY.");
  }

  const prompt = `
You are an expert technical recruiter. Score this candidate against the job and return a detailed evaluation.

JOB DETAILS:
- Title: ${job.title}
- Department: ${job.department ?? "Not specified"}
- Location: ${job.location ?? "Not specified"}
- Experience Required: ${job.experience_required} years
- Description: ${job.description}

CANDIDATE PROFILE:
- Name: ${parsed.name}
- Experience: ${parsed.experience_years} years
- Education: ${parsed.education}
- Skills: ${parsed.skills.join(", ")}
- Summary: ${parsed.summary}
- Projects: ${JSON.stringify(parsed.projects)}

SCORING FORMULA (use these exact weights):
- Skills Match (35%): How well candidate's skills match job requirements
- Experience Score (25%): Relevance and years of experience
- Projects Score (20%): Quality and relevance of projects
- Education Score (10%): Education fit for the role
- Relevance Score (10%): Overall profile-to-job alignment

DECISION RULES:
- final_score > 70 → decision: "shortlist"
- final_score 50-70 → decision: "hold"
- final_score < 50 → decision: "reject"

Return ONLY a valid JSON object (no markdown, no fences) with this EXACT structure:
{
  "final_score": 0,
  "skills_match": 0,
  "experience_score": 0,
  "projects_score": 0,
  "education_score": 0,
  "relevance_score": 0,
  "matched_skills": ["skill1", "skill2"],
  "skill_gaps": ["missing_skill1"],
  "analysis": "Detailed 3-4 sentence analysis of the candidate",
  "reasoning": "Why this score and decision was given",
  "decision": "shortlist|hold|reject",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "next_action": "Specific recommended next step",
  "interview_questions": [
    {"question": "Question text", "category": "Technical|Behavioral|Situational"}
  ]
}

Important:
- All scores are 0-100 integers
- final_score = (skills_match × 0.35) + (experience_score × 0.25) + (projects_score × 0.20) + (education_score × 0.10) + (relevance_score × 0.10)
- Generate 5 interview questions tailored to this candidate + job
- Be objective and thorough
`;

  return generateJson<ScoringResult>(prompt);
}

// ─── 3. Email Drafter ─────────────────────────────────────────────────────────

export async function draftEmail(
  candidate: { name: string; email: string },
  job: { title: string; department?: string },
  decision: "shortlist" | "hold" | "reject",
  companyName = "NIYUKTAi Recruitment"
): Promise<{ subject: string; body: string; type: string }> {
  if (!isAiEnabled()) {
    throw new Error("AI is not enabled.");
  }

  const emailType =
    decision === "shortlist"
      ? "interview_invite"
      : decision === "hold"
        ? "on_hold"
        : "rejection";

  const tone =
    decision === "shortlist"
      ? "enthusiastic and welcoming"
      : decision === "hold"
        ? "warm and hopeful"
        : "respectful and encouraging";

  const prompt = `
Write a professional recruitment email for the following scenario.

Details:
- Candidate Name: ${candidate.name}
- Job Title: ${job.title}
- Department: ${job.department ?? ""}
- Decision: ${decision.toUpperCase()}
- Company: ${companyName}
- Email Tone: ${tone}

Email Type: ${emailType}
${
  decision === "shortlist"
    ? "- Invite for interview, mention next steps"
    : decision === "hold"
      ? "- Inform application is under consideration, will be in touch"
      : "- Politely decline, encourage future applications"
}

Return ONLY a valid JSON object (no markdown, no fences):
{
  "subject": "Email subject line",
  "body": "Full email body with proper greeting and sign-off. Use \\n for line breaks.",
  "type": "${emailType}"
}

Keep the email professional, concise (150-200 words), and human-sounding.
`;

  const result = await generateJson<{ subject: string; body: string; type: string }>(prompt);
  return { ...result, type: emailType };
}

// ─── 4. Autonomous Agent — Master Pipeline ───────────────────────────────────

export async function autonomousAgent(
  candidateId: string,
  jobId?: string
): Promise<AgentResult> {
  const supabase = getServiceClient();
  const steps: AgentStep[] = [];

  const log = async (
    step: string,
    status: "success" | "failed" | "skipped",
    result?: Record<string, unknown>,
    error?: string
  ) => {
    steps.push({ step, status, result, error });
    try {
      await supabase.from("agent_logs").insert({
        candidate_id: candidateId,
        job_id: jobId ?? null,
        step,
        status,
        result: result ?? {},
        error: error ?? null,
      });
    } catch {
      // Don't fail agent if logging fails
    }
  };

  // ── Step 1: Fetch Candidate ──────────────────────────────────────────────
  const { data: candidate, error: candidateError } = await supabase
    .from("candidates")
    .select("*")
    .eq("id", candidateId)
    .single();

  if (candidateError || !candidate) {
    await log("fetch_candidate", "failed", {}, `Candidate not found: ${candidateError?.message}`);
    return {
      success: false,
      candidate_id: candidateId,
      parsed: {} as ParsedCandidate,
      steps,
      error: `Candidate not found: ${candidateError?.message}`,
    };
  }

  await log("fetch_candidate", "success", { name: candidate.name });

  // ── Step 2: Fetch Job (if jobId provided) ───────────────────────────────
  let job: Record<string, unknown> | null = null;
  if (jobId) {
    const { data: jobData, error: jobError } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (jobError || !jobData) {
      await log("fetch_job", "failed", {}, `Job not found: ${jobError?.message}`);
    } else {
      job = jobData;
      await log("fetch_job", "success", { title: jobData.title });
    }
  } else {
    await log("fetch_job", "skipped", { reason: "No jobId provided" });
  }

  // ── Step 3: Parse Resume with AI (if not already parsed) ────────────────
  let parsed: ParsedCandidate;

  if (candidate.resume_text && candidate.name && candidate.skills?.length > 0) {
    // Already parsed — reconstruct from DB
    parsed = {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone,
      location: candidate.location,
      summary: candidate.summary,
      experience_years: candidate.experience_years,
      education: candidate.education,
      skills: candidate.skills,
      projects: candidate.projects ?? [],
    };
    await log("parse_resume", "skipped", { reason: "Already parsed" });
  } else if (candidate.resume_text) {
    try {
      parsed = await parseResumeWithAI(candidate.resume_text);
      await log("parse_resume", "success", { skills_count: parsed.skills.length });

      // Update candidate with parsed data
      await supabase
        .from("candidates")
        .update({
          name: parsed.name || candidate.name,
          email: parsed.email || candidate.email,
          phone: parsed.phone || candidate.phone,
          location: parsed.location || candidate.location,
          summary: parsed.summary,
          experience_years: parsed.experience_years,
          education: parsed.education,
          skills: parsed.skills,
          projects: parsed.projects,
        })
        .eq("id", candidateId);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown parse error";
      await log("parse_resume", "failed", {}, errMsg);
      parsed = {
        name: candidate.name,
        email: candidate.email,
        phone: candidate.phone ?? "",
        location: candidate.location ?? "",
        summary: candidate.summary ?? "",
        experience_years: candidate.experience_years ?? 0,
        education: candidate.education ?? "",
        skills: candidate.skills ?? [],
        projects: candidate.projects ?? [],
      };
    }
  } else {
    await log("parse_resume", "skipped", { reason: "No resume text available" });
    parsed = {
      name: candidate.name,
      email: candidate.email,
      phone: candidate.phone ?? "",
      location: candidate.location ?? "",
      summary: candidate.summary ?? "",
      experience_years: candidate.experience_years ?? 0,
      education: candidate.education ?? "",
      skills: candidate.skills ?? [],
      projects: candidate.projects ?? [],
    };
  }

  // ── Step 4: Score Candidate Against Job ─────────────────────────────────
  let scoring: ScoringResult | undefined;

  if (job) {
    try {
      scoring = await scoreCandidate(parsed, {
        title: job.title as string,
        description: job.description as string,
        experience_required: job.experience_required as number,
        department: job.department as string,
        location: job.location as string,
      });

      await log("score_candidate", "success", {
        final_score: scoring.final_score,
        decision: scoring.decision,
      });

      // ── Step 5: Save AI Analysis ─────────────────────────────────────────
      const { error: analysisError } = await supabase.from("ai_analysis").upsert(
        {
          candidate_id: candidateId,
          job_id: jobId,
          final_score: scoring.final_score,
          skills_match: scoring.skills_match,
          experience_score: scoring.experience_score,
          projects_score: scoring.projects_score,
          education_score: scoring.education_score,
          relevance_score: scoring.relevance_score,
          matched_skills: scoring.matched_skills,
          skill_gaps: scoring.skill_gaps,
          analysis: scoring.analysis,
          reasoning: scoring.reasoning,
          decision: scoring.decision,
          strengths: scoring.strengths,
          weaknesses: scoring.weaknesses,
          next_action: scoring.next_action,
          interview_questions: scoring.interview_questions,
        },
        { onConflict: "candidate_id,job_id" }
      );

      if (analysisError) {
        await log("save_analysis", "failed", {}, analysisError.message);
      } else {
        await log("save_analysis", "success", { score: scoring.final_score });
      }

      // ── Step 6: Update Candidate Stage ───────────────────────────────────
      const stage = scoring.decision;
      const { error: stageError } = await supabase
        .from("candidates")
        .update({ stage, score: scoring.final_score, job_id: jobId })
        .eq("id", candidateId);

      if (stageError) {
        await log("update_stage", "failed", {}, stageError.message);
      } else {
        await log("update_stage", "success", { stage });
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Scoring failed";
      await log("score_candidate", "failed", {}, errMsg);
    }
  } else {
    await log("score_candidate", "skipped", { reason: "No job provided for scoring" });
  }

  // ── Step 7: Draft Email ──────────────────────────────────────────────────
  let emailDraft:
    | {
        subject: string;
        body: string;
        type: string;
      }
    | undefined;

  const decision = scoring?.decision ?? "hold";

  try {
    emailDraft = await draftEmail(
      { name: parsed.name, email: parsed.email },
      {
        title: (job?.title as string) ?? "the position",
        department: job?.department as string,
      },
      decision
    );

    // Save to email_logs
    const { error: emailError } = await supabase.from("email_logs").insert({
      candidate_id: candidateId,
      job_id: jobId ?? null,
      type: emailDraft.type,
      subject: emailDraft.subject,
      body: emailDraft.body,
      status: "draft",
    });

    if (emailError) {
      await log("draft_email", "failed", {}, emailError.message);
    } else {
      await log("draft_email", "success", { type: emailDraft.type });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Email draft failed";
    await log("draft_email", "failed", {}, errMsg);
  }

  // ── Step 8: Complete ─────────────────────────────────────────────────────
  await log("agent_complete", "success", {
    total_steps: steps.length,
    decision,
  });

  return {
    success: true,
    candidate_id: candidateId,
    job_id: jobId,
    parsed,
    scoring,
    email: emailDraft,
    steps,
  };
}