"use server";

import { requireAdmin } from "@/data/requireAdmin";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { knowledgeBaseSchema } from "@/lib/zodSchema";

export async function createKnowledgeBase(data: {
  name: string;
  files: Array<{
    url: string;
    fileType?: string;
    fileName: string;
  }>;
}) {
  const session = await requireAdmin();

  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const validation = knowledgeBaseSchema.safeParse(data);

    if (!validation.success) {
      return {
        success: false,
        error: validation.error.issues.map((issue) => issue.message).join(", "),
      };
    }

    const { name, files } = validation.data;

    const createdEntries = await prisma.$transaction(
      files.map((file) =>
        prisma.knowledgeBase.create({
          data: {
            name: `${name}${files.length > 1 ? ` - ${file.fileName}` : ""}`,
            url: file.url,
            fileType: file.fileType || null,
          },
        })
      )
    );

    revalidatePath("/admin/knowledgebase");
    return {
      success: true,
      data: createdEntries,
    };
  } catch (error) {
    console.error("Error creating knowledge base:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create knowledge base",
    };
  }
}

export async function deleteKnowledgeBase(id: string) {
  const session = await requireAdmin();

  if (!session?.user) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    await prisma.knowledgeBase.delete({
      where: { id },
    });

    revalidatePath("/admin/knowledgebase");
    return {
      success: true,
    };
  } catch (error) {
    console.error("Error deleting knowledge base:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete knowledge base",
    };
  }
}

