export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── GET /api/candidates ───────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);

    const userId = searchParams.get("user_id");
    const jobId = searchParams.get("job_id");
    const stage = searchParams.get("stage"); // applied, shortlist, hold, reject
    const candidateId = searchParams.get("id");
    const search = searchParams.get("search");
    const limit = parseInt(searchParams.get("limit") ?? "50");
    const offset = parseInt(searchParams.get("offset") ?? "0");

    let query = supabase
      .from("candidates")
      .select(
        `
        *,
        jobs(id, title, department),
        ai_analysis(final_score, decision, analysis, matched_skills, skill_gaps, interview_questions)
      `
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (candidateId) query = query.eq("id", candidateId);
    if (userId) query = query.eq("user_id", userId);
    if (jobId) query = query.eq("job_id", jobId);
    if (stage) query = query.eq("stage", stage);

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ candidates: data, count: data?.length ?? 0, offset, limit });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ── PATCH /api/candidates ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const body = await req.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "location",
      "summary",
      "experience_years",
      "education",
      "skills",
      "projects",
      "resume_url",
      "score",
      "stage",
      "status",
      "job_id",
    ];

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowedFields.includes(key))
    );

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("candidates")
      .update(filteredUpdates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ candidate: data, message: "Candidate updated successfully" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ── DELETE /api/candidates ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Candidate ID is required" }, { status: 400 });
    }

    // Delete related records first (cascade manually since RLS is off)
    await supabase.from("ai_analysis").delete().eq("candidate_id", id);
    await supabase.from("email_logs").delete().eq("candidate_id", id);
    await supabase.from("agent_logs").delete().eq("candidate_id", id);

    const { error } = await supabase.from("candidates").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Candidate and related data deleted successfully" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}