export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gemini } from "@/lib/ai/groq";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidate_id, job_id, type, user_id } = body;

    if (!candidate_id) {
      return NextResponse.json({ error: "candidate_id is required" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Fetch candidate
    const { data: candidate, error: cErr } = await supabase
      .from("candidates")
      .select("name, email, stage, skills, experience_years, education")
      .eq("id", candidate_id)
      .single();

    if (cErr || !candidate) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // Fetch job (optional)
    let jobTitle = "the position";
    let jobDept = "";
    if (job_id) {
      const { data: jobData } = await supabase
        .from("jobs")
        .select("title, department")
        .eq("id", job_id)
        .single();
      if (jobData) {
        jobTitle = jobData.title
        jobDept = jobData.department ?? ""
      }
    }

    // Map template type to email tone
    const toneMap: Record<string, string> = {
      shortlist: "shortlisting/moving forward with the application — warm and encouraging",
      interview: "scheduling an interview — professional and exciting",
      rejection: "polite rejection — empathetic, kind, encouraging for future",
      offer: "job offer — celebratory and professional",
    }
    const tone = toneMap[type ?? "shortlist"] ?? toneMap["shortlist"]

    // Generate email with Groq AI
    const prompt = `You are an HR professional writing a recruitment email.

Candidate Details:
- Name: ${candidate.name}
- Email: ${candidate.email ?? "N/A"}
- Skills: ${Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "N/A"}
- Experience: ${candidate.experience_years ?? 0} years
- Education: ${candidate.education ?? "N/A"}
- Current Stage: ${candidate.stage ?? "applied"}

Job: ${jobTitle}${jobDept ? ` (${jobDept})` : ""}

Email Purpose: ${tone}

Write a professional, personalized recruitment email. Use the candidate's name.
Make it warm, human, and specific to their background.

Return ONLY a valid JSON object in this exact format:
{
  "subject": "email subject line here",
  "body": "full email body here with proper line breaks using \\n",
  "type": "${type ?? "shortlist"}"
}`

    const raw = await gemini(prompt, { temperature: 0.5 })

    // Parse JSON response
    let emailDraft: { subject: string; body: string; type: string }
    try {
      const cleaned = raw
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim()
      emailDraft = JSON.parse(cleaned)
    } catch {
      // Fallback if JSON parse fails
      emailDraft = {
        subject: `Update on Your Application for ${jobTitle}`,
        body: raw,
        type: type ?? "shortlist",
      }
    }

    // Save draft to email_logs
    await supabase.from("email_logs").insert({
      user_id: user_id ?? null,
      candidate_id,
      job_id: job_id ?? null,
      type: emailDraft.type,
      subject: emailDraft.subject,
      body: emailDraft.body,
      status: "draft",
    })

    return NextResponse.json({
      success: true,
      email: {
        subject: emailDraft.subject,
        body: emailDraft.body,
        type: emailDraft.type,
      },
      candidate: {
        name: candidate.name,
        email: candidate.email,
      },
    })

  } catch (err) {
    console.error("[draft-email] Error:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    )
  }
}