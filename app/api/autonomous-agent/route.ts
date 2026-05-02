export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { autonomousAgent } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { candidate_id, job_id } = body;

    if (!candidate_id) {
      return NextResponse.json({ error: "candidate_id is required" }, { status: 400 });
    }

    const result = await autonomousAgent(candidate_id, job_id ?? undefined);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error ?? "Agent failed",
          steps: result.steps,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      candidate_id: result.candidate_id,
      job_id: result.job_id,
      parsed: result.parsed,
      scoring: result.scoring,
      email: result.email,
      steps: result.steps,
      summary: {
        decision: result.scoring?.decision ?? "pending",
        final_score: result.scoring?.final_score ?? 0,
        steps_completed: result.steps.filter((s) => s.status === "success").length,
        steps_failed: result.steps.filter((s) => s.status === "failed").length,
      },
    });
  } catch (err) {
    console.error("[autonomous-agent] Error:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}