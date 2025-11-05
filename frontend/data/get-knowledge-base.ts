import "server-only";
import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export async function getKnowledgeBases() {
  await requireAdmin();

  try {
    const knowledgeBases = await prisma.knowledgeBase.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return knowledgeBases;
  } catch (error) {
    console.error("Error fetching knowledge bases:", error);
    return [];
  }
}

export type KnowledgeBase = Awaited<ReturnType<typeof getKnowledgeBases>>[0];

