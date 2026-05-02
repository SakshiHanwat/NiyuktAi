import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";

let groqClient: Groq | null = null;

function getClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not set in environment variables.");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

export function isAiEnabled(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Main text completion function.
 * Named "gemini" for backward compatibility with existing code.
 */
export async function gemini(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<string> {
  const client = getClient();

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [];

  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: options.temperature ?? 0.3,
    max_tokens: options.maxTokens ?? 4096,
  });

  return completion.choices[0]?.message?.content ?? "";
}

/**
 * Generate structured JSON output from a prompt.
 * Strips markdown fences before parsing.
 */
export async function generateJson<T>(
  prompt: string,
  options: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
  } = {}
): Promise<T> {
  const systemPrompt =
    options.systemPrompt ??
    "You are a precise JSON generator. Respond ONLY with valid JSON. No markdown, no code fences, no explanation. Just raw JSON.";

  const raw = await gemini(prompt, {
    ...options,
    systemPrompt,
  });

  // Strip ```json ... ``` or ``` ... ``` fences if present
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Second attempt: extract the first {...} or [...] block
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]) as T;
    }
    throw new Error(`Groq returned invalid JSON.\nRaw output:\n${raw}`);
  }
}