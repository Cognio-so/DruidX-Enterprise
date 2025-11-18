import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/data/requireUser";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const { instructions, gptName, gptDescription } = await req.json();

    if (!instructions || typeof instructions !== "string" || !instructions.trim()) {
      return NextResponse.json(
        { error: "Instructions are required to enhance the prompt." },
        { status: 400 }
      );
    }

    const systemPrompt = `You are an elite prompt engineer and AI product lead.
Given existing GPT instructions, your job is to enhance them so they are clearer, better structured, and far more actionable.

Guidelines:
- Preserve the author's intent and any domain-specific details.
- Expand on missing steps, edge cases, safety rails, and response structure.
- Organize the content with headings, bullet lists, numbered steps, and callouts where helpful.
- Keep the tone professional, confident, and collaborative.
- If the provided instructions are already strong, polish them for clarity and completeness.
- Output only the enhanced instructions text, no commentary or metadata.`;

    const userPrompt = [
      gptName ? `GPT Name: ${gptName}` : null,
      gptDescription ? `GPT Description: ${gptDescription}` : null,
      `Original Instructions:\n${instructions}`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Prompt enhancement error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enhance instructions." },
      { status: 500 }
    );
  }
}

