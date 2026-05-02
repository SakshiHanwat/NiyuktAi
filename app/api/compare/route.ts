export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateJson } from "@/lib/ai/groq";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

interface ComparisonResult {
  ranked_candidates: {
    rank: number;
    candidate_id: string;
    name: string;
    overall_score: number;
    strengths: string[];
    weaknesses: string[];
    recommendation: string;
    hire_probability: "high" | "medium" | "low";
  }[];
  top_pick: {
    candidate_id: string;
    name: string;
    reason: string;
  };
  comparison_matrix: {
    category: string;
    scores: Record<string, number>; // candidate_name → score
  }[];
  summary: string;
  hiring_advice: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidate_ids, job_id } = body;

    if (!candidate_ids || !Array.isArray(candidate_ids)) {
      return NextResponse.json({ error: "candidate_ids array is required" }, { status: 400 });
    }

    if (candidate_ids.length < 2 || candidate_ids.length > 4) {
      return NextResponse.json(
        { error: "Compare between 2 and 4 candidates" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // ── Fetch candidates ──────────────────────────────────────────────────
    const { data: candidates, error: cErr } = await supabase
      .from("candidates")
      .select(
        `
        id, name, email, experience_years, education, skills, projects, summary, score, stage,
        ai_analysis(final_score, skills_match, experience_score, projects_score, education_score, analysis, decision, strengths, weaknesses, matched_skills, skill_gaps)
      `
      )
      .in("id", candidate_ids);

    if (cErr || !candidates || candidates.length === 0) {
      return NextResponse.json({ error: "Candidates not found" }, { status: 404 });
    }

    // ── Fetch job (optional) ──────────────────────────────────────────────
    let jobContext = "";
    if (job_id) {
      const { data: job } = await supabase
        .from("jobs")
        .select("title, description, experience_required")
        .eq("id", job_id)
        .single();

      if (job) {
        jobContext = `
JOB CONTEXT:
- Title: ${job.title}
- Experience Required: ${job.experience_required} years
- Description: ${job.description}
`;
      }
    }

    // ── Build candidate summaries ─────────────────────────────────────────
    const candidateSummaries = candidates
      .map((c, i) => {
        const analysis = Array.isArray(c.ai_analysis) ? c.ai_analysis[0] : c.ai_analysis;
        return `
CANDIDATE ${i + 1}: ${c.name} (ID: ${c.id})
- Experience: ${c.experience_years} years
- Education: ${c.education}
- Skills: ${c.skills?.join(", ") ?? "Not specified"}
- Summary: ${c.summary ?? "Not available"}
- Projects: ${c.projects?.length ?? 0} projects
- AI Score: ${analysis?.final_score ?? c.score ?? "Not scored"}
- Decision: ${analysis?.decision ?? c.stage ?? "Not evaluated"}
- Strengths: ${analysis?.strengths?.join(", ") ?? "Not analyzed"}
- Weaknesses: ${analysis?.weaknesses?.join(", ") ?? "Not analyzed"}
- Matched Skills: ${analysis?.matched_skills?.join(", ") ?? "N/A"}
- Skill Gaps: ${analysis?.skill_gaps?.join(", ") ?? "N/A"}
`;
      })
      .join("\n");

    // ── AI Comparison Prompt ──────────────────────────────────────────────
    const prompt = `
You are a senior technical recruiter. Compare these ${candidates.length} candidates and provide a detailed ranking.

${jobContext}

CANDIDATES:
${candidateSummaries}

Analyze and compare all candidates across these dimensions:
1. Technical Skills & Stack Match
2. Experience Quality & Relevance
3. Project Portfolio
4. Education & Credentials
5. Overall Hiring Potential

Return ONLY a valid JSON object (no markdown, no fences) with this EXACT structure:
{
  "ranked_candidates": [
    {
      "rank": 1,
      "candidate_id": "uuid",
      "name": "Candidate Name",
      "overall_score": 85,
      "strengths": ["strength1", "strength2"],
      "weaknesses": ["weakness1"],
      "recommendation": "2-3 sentence specific recommendation",
      "hire_probability": "high"
    }
  ],
  "top_pick": {
    "candidate_id": "uuid",
    "name": "Name",
    "reason": "2-3 sentences why this person is the best pick"
  },
  "comparison_matrix": [
    {
      "category": "Technical Skills",
      "scores": {
        "Candidate Name 1": 85,
        "Candidate Name 2": 72
      }
    }
  ],
  "summary": "3-4 sentence overview of the comparison",
  "hiring_advice": "Specific actionable advice for the hiring manager"
}

Rules:
- ranked_candidates must be sorted by overall_score descending (rank 1 = best)
- hire_probability: "high" (>70), "medium" (50-70), "low" (<50)
- comparison_matrix must include ALL categories for ALL candidates
- Be specific and data-driven, not generic
`;

    const comparison = await generateJson<ComparisonResult>(prompt);

    return NextResponse.json({
      success: true,
      comparison,
      candidates_compared: candidates.map((c) => ({ id: c.id, name: c.name })),
      job_id: job_id ?? null,
    });
  } catch (err) {
    console.error("[compare] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}