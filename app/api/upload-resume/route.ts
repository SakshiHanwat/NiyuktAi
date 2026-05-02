export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractTextFromPDF } from "@/lib/pdf/parse";
import { parseResumeWithAI } from "@/lib/ai/prompts";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    const jobId = formData.get("job_id") as string | null;
    const userId = formData.get("user_id") as string | null;

    if (!file) return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File size must be under 10MB" }, { status: 400 });

    const supabase = getServiceClient();

    // ── 1. Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // ── 2. Extract text from PDF
    let resumeText: string;
    try {
      resumeText = await extractTextFromPDF(buffer);
    } catch (err) {
      return NextResponse.json({ error: `PDF extraction failed: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 422 });
    }

    if (!resumeText || resumeText.trim().length < 50) {
      return NextResponse.json({ error: "Could not extract meaningful text from PDF." }, { status: 422 });
    }

    // ── 3. Upload PDF to Supabase Storage
    const fileName = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const storagePath = userId ? `${userId}/${fileName}` : `public/${fileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from("resumes")
      .upload(storagePath, buffer, { contentType: "application/pdf", upsert: false });

    if (storageError) return NextResponse.json({ error: `Storage upload failed: ${storageError.message}` }, { status: 500 });

    const { data: { publicUrl } } = supabase.storage.from("resumes").getPublicUrl(storageData.path);

    // ── 4. Parse resume with AI
    let parsed;
    try {
      parsed = await parseResumeWithAI(resumeText);
    } catch (err) {
      return NextResponse.json({ error: `AI parsing failed: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
    }

    // ── 5. Save candidate to Supabase
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        user_id: userId ?? null,
        job_id: jobId ?? null,
        name: parsed.name,
        email: parsed.email,
        phone: parsed.phone,
        location: parsed.location,
        summary: parsed.summary,
        experience_years: parsed.experience_years,
        education: parsed.education,
        skills: parsed.skills,
        projects: parsed.projects,
        resume_url: publicUrl,
        resume_text: resumeText,
        score: 0,
        stage: "applied",
        status: "active",
      })
      .select()
      .single();

    if (candidateError) return NextResponse.json({ error: `Failed to save candidate: ${candidateError.message}` }, { status: 500 });

    // ── 6. Score calculate karo
    const skills = parsed.skills || []
    const experienceYears = parsed.experience_years || 0
    const projects = parsed.projects || []
    const education = parsed.education || ""
    let finalScore = 0
    let decision = "reject"
    let newStage = "applied"

    if (jobId) {
      const { data: job } = await supabase
        .from("jobs")
        .select("description, experience_required, title")
        .eq("id", jobId)
        .single()

      const jobTitle = (job?.title || "").toLowerCase()
      const jobDesc = (job?.description || "").toLowerCase()
      const expRequired = Number(job?.experience_required?.match(/\d+/)?.[0] || 1)
      const resumeSkills = skills.map((s: string) => s.toLowerCase())

      // Job ke meaningful keywords
      const jobKeywords = jobDesc
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .filter((w: string, i: number, arr: string[]) => arr.indexOf(w) === i)

      const matched = resumeSkills.filter((skill: string) =>
        jobKeywords.some((kw: string) => kw.includes(skill) || skill.includes(kw))
      )

      const titleWords = jobTitle.split(/\s+/)
      const titleMatch = resumeSkills.some((skill: string) =>
        titleWords.some((tw: string) => tw.includes(skill) || skill.includes(tw))
      )

      const skillsMatch = Math.min(100, Math.round((matched.length / Math.max(jobKeywords.length * 0.3, 1)) * 100))
      const experienceScore = expRequired === 0
        ? (experienceYears > 0 ? 80 : 60)
        : Math.min(100, Math.round((experienceYears / expRequired) * 100))
      const projectsScore = Math.min(100, (Array.isArray(projects) ? projects.length : 0) * 20)
      const educationScore = education ? 80 : 0
      const relevanceScore = titleMatch
        ? Math.min(100, matched.length * 10 + 30)
        : Math.min(60, matched.length * 8)

      finalScore = Math.round(
        skillsMatch * 0.35 +
        experienceScore * 0.25 +
        projectsScore * 0.20 +
        educationScore * 0.10 +
        relevanceScore * 0.10
      )

      decision = finalScore >= 70 ? "shortlist" : finalScore >= 50 ? "hold" : "reject"
      newStage = finalScore >= 70 ? "shortlisted" : finalScore >= 50 ? "screening" : "applied"

      await supabase.from("ai_analysis").insert({
        user_id: userId ?? null,
        candidate_id: candidate.id,
        job_id: jobId,
        final_score: finalScore,
        skills_match: skillsMatch,
        experience_score: experienceScore,
        projects_score: projectsScore,
        education_score: educationScore,
        relevance_score: relevanceScore,
        matched_skills: matched,
        skill_gaps: [],
        decision,
        analysis: `Score: ${finalScore}/100 — Skills: ${skillsMatch}, Exp: ${experienceScore}, Projects: ${projectsScore}`
      })
    } else {
      finalScore = Math.min(85,
        Math.min(30, skills.length * 3) +
        Math.min(25, experienceYears * 8) +
        Math.min(20, (Array.isArray(projects) ? projects.length : 0) * 7) +
        (education ? 10 : 0)
      )
      newStage = "applied"
      decision = "hold"
    }

    // ── 7. Update candidate score + stage
    await supabase
      .from("candidates")
      .update({ score: finalScore, stage: newStage })
      .eq("id", candidate.id)

    // ── 8. Log the upload step
    await supabase.from("agent_logs").insert({
      user_id: userId ?? null,
      candidate_id: candidate.id,
      job_id: jobId ?? null,
      step: "upload_and_parse",
      status: "success",
      result: {
        file_name: fileName,
        text_length: resumeText.length,
        skills_found: parsed.skills.length,
        experience_years: parsed.experience_years,
        final_score: finalScore,
        decision,
      },
    });

    return NextResponse.json({
      success: true,
      candidate: { ...candidate, score: finalScore, stage: newStage },
      parsed,
      resume_url: publicUrl,
      decision,
      message: `Resume parsed successfully. Score: ${finalScore}/100. Decision: ${decision}`,
    });

  } catch (err) {
    console.error("[upload-resume] Unexpected error:", err);
    return NextResponse.json({ error: `Unexpected error: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
  }
}