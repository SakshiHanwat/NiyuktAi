export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ─── Core: Vercel AI Gateway + Gmail MCP ─────────────────────────────────────
async function sendViaGmailMCP(
  to: string,
  subject: string,
  body: string
): Promise<{ success: boolean; message_id?: string; error?: string }> {

  const gatewayKey  = process.env.VERCEL_AI_GATEWAY_API_KEY;
  const gmailMcpUrl = process.env.GMAIL_MCP_SERVER_URL; // https://mcp-gmail.vercel.app/connect

  if (!gatewayKey)  return { success: false, error: "VERCEL_AI_GATEWAY_API_KEY is not set" };
  if (!gmailMcpUrl) return { success: false, error: "GMAIL_MCP_SERVER_URL is not set" };

  // Vercel AI Gateway proxies to Anthropic — same request format,
  // different base URL and auth header
  let response: Response;
  try {
    response = await fetch("https://ai-gateway.vercel.sh/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":    "application/json",
        "x-api-key":       gatewayKey,           // ← Vercel gateway key (NOT GROQ)
        "anthropic-version": "2023-06-01",
        "anthropic-beta":  "mcp-client-1.0",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1024,
        mcp_servers: [
          {
            type: "url",
            url:  gmailMcpUrl,
            name: "gmail",
          },
        ],
        messages: [
          {
            role: "user",
            content: `You have Gmail access via MCP tools. Send this email immediately — no confirmation needed.

To: ${to}
Subject: ${subject}
Body:
${body}

Use the Gmail send tool now. Respond ONLY with JSON:
{"sent": true, "message_id": "<id from gmail>"}
Or on failure:
{"sent": false, "error": "<reason>"}`,
          },
        ],
      }),
    });
  } catch (networkErr) {
    return {
      success: false,
      error: `Network error: ${networkErr instanceof Error ? networkErr.message : String(networkErr)}`,
    };
  }

  // Non-2xx from gateway
  if (!response.ok) {
    const text = await response.text();
    return { success: false, error: `Gateway ${response.status}: ${text.slice(0, 300)}` };
  }

  // Parse Claude's response
  let data: { content?: { type: string; text?: string }[]; error?: { message: string } };
  try {
    data = await response.json();
  } catch {
    return { success: false, error: "Gateway returned non-JSON response" };
  }

  if (data.error) return { success: false, error: data.error.message };

  // Extract text block from content array
  const textContent = data.content?.find((b) => b.type === "text")?.text ?? "";

  // Try JSON parse of Claude's confirmation
  try {
    const jsonMatch = textContent.match(/\{[\s\S]*?\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { sent?: boolean; message_id?: string; error?: string };
      if (parsed.sent === true) {
        return { success: true, message_id: parsed.message_id ?? "sent" };
      }
      return { success: false, error: parsed.error ?? "Claude reported send failure" };
    }
  } catch { /* fall through to text check */ }

  // Fallback: if Claude says "sent" in natural language, accept it
  const lower = textContent.toLowerCase();
  if (lower.includes("email has been sent") || lower.includes("successfully sent")) {
    return { success: true, message_id: "confirmed-via-text" };
  }

  return { success: false, error: `Unexpected response: ${textContent.slice(0, 200)}` };
}

// ── POST /api/send-email ──────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email_log_id,   // existing draft in email_logs (optional — to update status)
      candidate_id,
      job_id,
      to,
      subject,
      email_body,
      type     = "custom",
      user_id,
    } = body;

    if (!to || !subject || !email_body) {
      return NextResponse.json(
        { error: "to, subject, and email_body are required" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const now      = new Date().toISOString();

    // ── Call Vercel AI Gateway → Gmail MCP ──────────────────────────────────
    const result = await sendViaGmailMCP(to, subject, email_body);

    // ── Helper: upsert email_log ─────────────────────────────────────────────
    const upsertEmailLog = async (status: "sent" | "failed") => {
      if (email_log_id) {
        await supabase
          .from("email_logs")
          .update({ status, ...(status === "sent" ? { sent_at: now } : {}) })
          .eq("id", email_log_id);
      } else {
        await supabase.from("email_logs").insert({
          user_id:      user_id      ?? null,
          candidate_id: candidate_id ?? null,
          job_id:       job_id       ?? null,
          type,
          subject,
          body:         email_body,
          status,
          ...(status === "sent" ? { sent_at: now } : {}),
        });
      }
    };

    // ── Helper: write agent_log ──────────────────────────────────────────────
    const writeAgentLog = async (status: "success" | "failed", extra: Record<string, unknown>) => {
      if (!candidate_id) return;
      await supabase.from("agent_logs").insert({
        user_id:      user_id      ?? null,
        candidate_id,
        job_id:       job_id       ?? null,
        step:         "send_email",
        status,
        result:       { to, subject, type, ...extra },
        error:        status === "failed" ? (extra.error as string ?? null) : null,
      });
    };

    if (!result.success) {
      await upsertEmailLog("failed");
      await writeAgentLog("failed", { error: result.error });
      return NextResponse.json(
        { success: false, error: result.error, message: "Email send failed. Saved in logs." },
        { status: 502 }
      );
    }

    await upsertEmailLog("sent");
    await writeAgentLog("success", { message_id: result.message_id, sent_at: now });

    return NextResponse.json({
      success:    true,
      message:    "Email sent via Gmail MCP",
      message_id: result.message_id,
      sent_at:    now,
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
    const userId      = searchParams.get("user_id");
    const status      = searchParams.get("status");

    let query = supabase
      .from("email_logs")
      .select(`*, candidates(name, email), jobs(title)`)
      .order("created_at", { ascending: false });

    if (candidateId) query = query.eq("candidate_id", candidateId);
    if (userId)      query = query.eq("user_id",      userId);
    if (status)      query = query.eq("status",       status);

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ email_logs: data, count: data?.length ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}