  "use server";

import { requireAdmin } from "@/data/requireAdmin";
import prisma from "@/lib/prisma";
import { gptSchema } from "@/lib/zodSchema";
import { revalidatePath } from "next/cache";

const modelMapping: Record<string, string> = {
  "gemini_2_5_flash": "gemini_2_5_flash",
  "gemini_2_5_pro": "gemini_2_5_pro",
  "gemini_2_5_flash_lite": "gemini_2_5_flash_lite",
  "gpt_4_1": "gpt_4_1",
  "gpt_5": "gpt_5",
  "gpt_5_thinking_high": "gpt_5_thinking_high",
  "gpt_5_mini": "gpt_5_mini",
  "gpt_5_nano": "gpt_5_nano",
  "gpt_4o": "gpt_4o",
  "claude_sonnet_4_5": "claude_sonnet_4_5",
  "claude_opus_4_1": "claude_opus_4_1",
  "claude_haiku_3_5": "claude_haiku_3_5",
  "grok_4_fast": "grok_4_fast",
  "deepseek_v3_1": "deepseek_v3_1",
  "meta_llama_3_3_70b": "meta_llama_3_3_70b",
  "kimi_k2_0905": "kimi_k2_0905",
};

const reverseModelMapping: Record<string, string> = {
  "gemini_2_5_flash": "gemini_2_5_flash",
  "gemini_2_5_pro": "gemini_2_5_pro",
  "gemini_2_5_flash_lite": "gemini_2_5_flash_lite",
  "gpt_4_1": "gpt_4_1",
  "gpt_5": "gpt_5",
  "gpt_5_thinking_high": "gpt_5_thinking_high",
  "gpt_5_mini": "gpt_5_mini",
  "gpt_5_nano": "gpt_5_nano",
  "gpt_4o": "gpt_4o",
  "claude_sonnet_4_5": "claude_sonnet_4_5",
  "claude_opus_4_1": "claude_opus_4_1",
  "claude_haiku_3_5": "claude_haiku_3_5",
  "grok_4_fast": "grok_4_fast",
  "deepseek_v3_1": "deepseek_v3_1",
  "meta_llama_3_3_70b": "meta_llama_3_3_70b",
  "kimi_k2_0905": "kimi_k2_0905",
};

export async function getGptById(id: string) {
  const session = await requireAdmin();    
  
  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const currentAdminId = session.user.id;

  try {
    const gpt = await prisma.gpt.findFirst({
      where: { 
        id,
        userId: currentAdminId,  // Only allow access to GPTs created by current admin
      },
      select: {
        id: true,
        name: true,
        description: true,
        model: true,
        instruction: true,
        webBrowser: true,
        hybridRag: true,
        image: true,
        imageEnabled: true,
        videoEnabled: true,
        imageModel: true,
        videoModel: true,
        knowledgeBase: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!gpt) {
      return {
        success: false,
        error: "GPT not found",
      };
    }

    // Transform the data for the form
    const transformedGpt = {
      ...gpt,
      model: reverseModelMapping[gpt.model] || gpt.model,
      docs: gpt.knowledgeBase ? JSON.parse(gpt.knowledgeBase) : [],
      // Explicitly include image/video fields to ensure they're passed
      imageEnabled: gpt.imageEnabled ?? false,
      videoEnabled: gpt.videoEnabled ?? false,
      imageModel: gpt.imageModel ?? null,
      videoModel: gpt.videoModel ?? null,
    };

    return {
      success: true,
      data: transformedGpt,
    };
  } catch (error) {
    console.error("Error fetching GPT:", error);
    return {
      success: false,
      error: "Failed to fetch GPT",
    };
  }
}

export async function editGpt(data: {
  id: string;
  gptName: string;
  gptDescription: string;
  model: string;
  instructions: string;
  webSearch: boolean;
  hybridRag: boolean;
  docs: string[];
  imageUrl?: string;
  image: boolean;
  video: boolean;
  imageModel?: string;
  videoModel?: string;
}) {
  const session = await requireAdmin();

  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  const currentAdminId = session.user.id;

  try {
    // First check if GPT exists and belongs to current admin
    const existingGpt = await prisma.gpt.findFirst({
      where: {
        id: data.id,
        userId: currentAdminId,  // Only allow editing GPTs created by current admin
      },
    });

    if (!existingGpt) {
      return {
        success: false,
        error: "GPT not found or you don't have permission to edit it",
      };
    }

    const validation = gptSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.message,
      };
    }

    const validatedData = validation.data;

    const processedData = {
      name: validatedData.gptName,
      description: validatedData.gptDescription,
      model: modelMapping[validatedData.model] as any,
      instruction: validatedData.instructions,
      webBrowser: validatedData.webSearch,
      hybridRag: validatedData.hybridRag,
      image: validatedData.imageUrl || "default-avatar.png",
      imageEnabled: validatedData.image,
      videoEnabled: validatedData.video,
      imageModel: validatedData.imageModel || null,
      videoModel: validatedData.videoModel || null,
      knowledgeBase:
        validatedData.docs.length > 0
          ? JSON.stringify(validatedData.docs)
          : null,
    };

    // Update by id only (we already verified ownership above)
    const gpt = await prisma.gpt.update({
      where: {
        id: data.id,
      },
      data: processedData,
    });

    revalidatePath("/admin/gpts");
    revalidatePath(`/admin/gpts/${data.id}`);

    return {
      success: true,
      message: "GPT updated successfully",
      data: gpt,
    };
  } catch (error) {
    console.error("Error updating GPT:", error);
    return {
      success: false,
      error: "Failed to update GPT. Please try again.",
    };
  }
}
