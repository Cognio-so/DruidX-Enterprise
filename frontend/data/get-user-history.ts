import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getUserHistory() {
  try {
    const { user } = await requireUser();

    const conversations = await prisma.conversation.findMany({
    where: {
      userId: user.id
    },
    include: {
      gpt: {
        select: {
          id: true,
          name: true,
          image: true,
        }
      },
      messages: {
        orderBy: {
          timestamp: 'asc'
        },
        select: {
          content: true,
          role: true,
          timestamp: true,
        }
      },
      _count: {
        select: {
          messages: true
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

    return conversations;
  } catch (error) {
    // Handle database connection errors gracefully
    if (error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001") ||
         (error as any).code === "P1001")) {
      console.error("Database connection error:", error);
      return [];
    }
    throw error;
  }
}

export type UserHistory = Awaited<ReturnType<typeof getUserHistory>>[0];
