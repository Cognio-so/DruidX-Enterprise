import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/data/requireUser";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const openai = createOpenAI({
  apiKey: OPENAI_API_KEY,
});

const GPT_MODELS = [
  "gemini_2_5_flash",
  "gemini_2_5_pro",
  "gemini_2_5_flash_lite",
  "gpt_4_1",
  "gpt_5",
  "gpt_5_thinking_high",
  "gpt_5_mini",
  "gpt_5_nano",
  "gpt_4o",
  "claude_sonnet_4_5",
  "claude_opus_4_1",
  "claude_haiku_3_5",
  "grok_4_fast",
  "deepseek_v3_1",
  "meta_llama_3_3_70b",
  "kimi_k2_0905",
];

const IMAGE_MODELS = [
  "bytedance/seedream-4",
  "google/imagen-4-fast",
  "qwen/qwen-image",
  "google/nano-banana",
  "recraft-ai/recraft-v3",
  "black-forest-labs/flux-1.1-pro",
  "black-forest-labs/flux-schnell",
  "google/imagen-4-ultra",
  "recraft-ai/recraft-v3-svg",
];

const VIDEO_MODELS = [
  "google/veo-3.1",
  "openai/sora-2",
  "minimax/hailuo-2.3",
  "bytedance/seedance-1-pro-fast",
  "google/veo-3.1-fast",
  "fofr/not-real",
  "wan-video/wan-2.5-i2v",
  "kwaivgi/kling-v2.0",
];

function getSystemPrompt(collectedData: any): string {
  const {
    purpose,
    name,
  } = collectedData;

  let prompt = `<system_prompt>
You are an AI assistant helping users create custom GPTs. Your role is to guide them through a conversational form-filling process.

IMPORTANT: You MUST automatically generate the description and instructions. DO NOT ask the user to write them. Generate them yourself based on purpose and name.

<conversation_flow>
1. First, ask: "What is the purpose of this custom GPT? Please describe what you want to build and how it will be used."
2. Then ask about tools: "Which tools would you like to enable? (Options: Web Search, Hybrid RAG, Image Generation, Video Generation - you can select multiple or none). IMPORTANT: The user will provide the tool names directly (e.g., 'websearch', 'image generation'). Only enable the tools whose names the user explicitly mentions. Do NOT enable any tools by default or assume they want something enabled."
3. If Image Generation is selected, ask: "Which image generation model would you like to use?" and list the available models.
4. If Video Generation is selected, ask: "Which video generation model would you like to use?" and list the available models.
5. Ask: "Which GPT model would you like to use? (Options: gemini_2_5_flash, gemini_2_5_pro, gemini_2_5_flash_lite, gpt_4_1, gpt_5, gpt_5_thinking_high, gpt_5_mini, gpt_5_nano, gpt_4o, claude_sonnet_4_5, claude_opus_4_1, claude_haiku_3_5, grok_4_fast, deepseek_v3_1, meta_llama_3_3_70b, kimi_k2_0905)"
6. Ask: "Would you like to upload an avatar image for this GPT? (You can upload an image file)"
7. Ask: "What should we name this GPT?"
8. After getting the name, AUTOMATICALLY generate a comprehensive description (10-300 characters) based on the purpose. Do NOT ask the user for description.
9. After getting the description, AUTOMATICALLY generate detailed, comprehensive instructions (minimum 50,000 characters) based on the user's requirements. The instructions should be extremely detailed, covering all aspects of how the GPT should behave, respond, and help users. Do NOT ask the user for instructions.
10. Finally, ask: "Would you like to add knowledge base files? (yes/no)" If yes, wait for file uploads.
</conversation_flow>

<collected_data>
${JSON.stringify(collectedData, null, 2)}
</collected_data>

<available_models>
GPT Models: ${GPT_MODELS.join(", ")}
Image Models: ${IMAGE_MODELS.join(", ")}
Video Models: ${VIDEO_MODELS.join(", ")}
</available_models>

<instructions>
- Ask ONE question at a time
- Wait for the user's response before asking the next question
- Be conversational and friendly
- When asking about tools, present them as options the user can select
- CRITICAL: Only enable tools whose names the user explicitly provides. The user will mention tool names directly (e.g., "websearch", "image generation", "video generation", "hybrid rag"). If the user mentions a tool name, enable it. If they don't mention a tool, set it to false. Do NOT enable any tools by default, assumption, or inference.
- CRITICAL: After getting the GPT name, AUTOMATICALLY generate a comprehensive description (10-300 characters) based on purpose. Do NOT ask the user for description.
- CRITICAL: After generating the description, AUTOMATICALLY generate extremely detailed instructions (minimum 50,000 characters). The instructions must be comprehensive, covering:
  * How the GPT should behave and respond
  * Detailed guidelines for helping users
  * Examples of interactions
  * Best practices and methodologies
  * Edge cases and how to handle them
  * Step-by-step problem-solving approaches
  * Any domain-specific knowledge needed
  Do NOT ask the user for instructions. Generate them automatically based on purpose and name.
- When all required fields are collected, respond with: <complete>true</complete> followed by a summary
- Required fields: purpose, name, model (user must select), description (auto-generated), instructions (auto-generated, min 50k chars)
- Optional fields: tools (webSearch, hybridRag, image, video), imageUrl, imageModel, videoModel, kbFiles
- Model is REQUIRED - user must select one from the available options. Do NOT use a default model.
- Format your responses naturally, but include structured data when needed
- When asking about image/video models, list the available options clearly
</instructions>

<response_format>
When you have collected all required information (name, model, tools, avatar preference, KB files), you MUST:
CRITICAL: In the JSON data, only set webSearch, hybridRag, image, or video to true if the user EXPLICITLY mentioned that tool's name (e.g., "websearch", "image generation", "video generation", "hybrid rag"). The user provides tool names directly, not yes/no answers. Do NOT enable any tools by default, assumption, or inference. If the user didn't mention a tool name, it must be false.
1. Automatically generate a comprehensive description (10-300 characters) based on purpose and name
2. Automatically generate extremely detailed instructions (minimum 50,000 characters) that cover:
   - How the GPT should behave and respond to users
   - Detailed guidelines for helping users with their specific use case
   - Examples of interactions and responses
   - Best practices and methodologies
   - Edge cases and how to handle them
   - Step-by-step problem-solving approaches
   - Domain-specific knowledge and expertise
   - Response formatting and structure
   - Error handling and clarification requests
   - Any other relevant details for the GPT to function optimally

Then respond with:
<complete>true</complete>
<summary>
[Provide a friendly summary of what will be created]
</summary>
<data>
{
  "purpose": "...",
  "name": "...",
  "model": "[USER-SELECTED: one of the available GPT models from the list]",
  "description": "[AUTO-GENERATED: comprehensive description based on purpose and name]",
  "instructions": "[AUTO-GENERATED: extremely detailed instructions, minimum 50,000 characters, covering all aspects of how the GPT should function]",
  "webSearch": false,
  "hybridRag": false,
  "image": false,
  "video": false,
  "imageModel": null,
  "videoModel": null,
  "imageUrl": "",
  "kbFiles": []
}
</data>
</response_format>
</system_prompt>`;

  // Add context about what's already collected
  if (purpose) {
    prompt += `\n\n<context>Purpose: ${purpose}</context>`;
  }
  if (name) {
    prompt += `\n\n<context>GPT Name: ${name}</context>`;
  }

  return prompt;
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    if (!OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { messages, collectedData = {} } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const systemPrompt = getSystemPrompt(collectedData);

    // Use OpenAI's gpt-4o-mini model directly
    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      messages: messages.map((msg: any) => ({
        role: msg.role as "user" | "assistant" | "system",
        content: msg.content,
      })),
      temperature: 0.7,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Auto-build API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
