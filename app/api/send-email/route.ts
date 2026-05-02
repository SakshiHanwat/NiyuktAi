export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      email_log_id,   // existing draft in email_logs (preferred)
      candidate_id,
      job_id,
      to,             // recipient email
      subject,
      email_body,
      type = "custom",
      user_id,
    } = body;

    if (!to || !subject || !email_body) {
      return NextResponse.json(
        { error: "to, subject, and email_body are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // ── Check Gmail MCP connection ────────────────────────────────────────
    const gmailMcpUrl = process.env.GMAIL_MCP_SERVER_URL;

    if (!gmailMcpUrl) {
      // Fallback: save as "pending" for manual send
      const { data: log, error: logErr } = await supabase
        .from("email_logs")
        .insert({
          user_id: user_id ?? null,
          candidate_id: candidate_id ?? null,
          job_id: job_id ?? null,
          type,
          subject,
          body: email_body,
          status: "pending",
        })
        .select()
        .single();

      if (logErr) {
        return NextResponse.json({ error: logErr.message }, { status: 500 });
      }

      return NextResponse.json({
        success: false,
        message: "Gmail MCP not configured. Email saved as pending.",
        email_log: log,
        requires_mcp: true,
      });
    }

    // ── Send via Gmail MCP ─────────────────────────────────────────────────
    // Gmail MCP uses the Anthropic API with mcp_servers parameter.
    // We call the Anthropic API to use Gmail MCP for sending the email.
    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-1.0",
        "x-api-key": process.env.GROQ_API_KEY ?? "", // use your Anthropic key here if different
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        mcp_servers: [
          {
            type: "url",
            url: gmailMcpUrl,
            name: "gmail-mcp",
          },
        ],
        messages: [
          {
            role: "user",
            content: `Send an email using Gmail with the following details:
To: ${to}
Subject: ${subject}
Body:
${email_body}

After sending, confirm with: {"sent": true, "message_id": "..."}`,
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      // MCP send failed — save as pending
      await supabase.from("email_logs").upsert({
        ...(email_log_id ? { id: email_log_id } : {}),
        user_id: user_id ?? null,
        candidate_id: candidate_id ?? null,
        job_id: job_id ?? null,
        type,
        subject,
        body: email_body,
        status: "failed",
      });

      return NextResponse.json(
        {
          error: `Gmail MCP send failed: ${errText}`,
          fallback: "Email saved as failed in logs",
        },
        { status: 502 }
      );
    }

    // ── Update email log to "sent" ─────────────────────────────────────────
    const now = new Date().toISOString();

    if (email_log_id) {
      await supabase
        .from("email_logs")
        .update({ status: "sent", sent_at: now })
        .eq("id", email_log_id);
    } else {
      await supabase.from("email_logs").insert({
        user_id: user_id ?? null,
        candidate_id: candidate_id ?? null,
        job_id: job_id ?? null,
        type,
        subject,
        body: email_body,
        status: "sent",
        sent_at: now,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Email sent successfully via Gmail",
      sent_at: now,
    });
  } catch (err) {
    console.error("[send-email] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ── GET /api/send-email — fetch email logs ────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = getServiceClient();
    const { searchParams } = new URL(req.url);

    const candidateId = searchParams.get("candidate_id");
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");

    let query = supabase
      .from("email_logs")
      .select(
        `
        *,
        candidates(name, email),
        jobs(title)
      `
      )
      .order("created_at", { ascending: false });

    if (candidateId) query = query.eq("candidate_id", candidateId);
    if (userId) query = query.eq("user_id", userId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ email_logs: data, count: data?.length ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}