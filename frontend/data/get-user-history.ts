import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getUserHistory() {
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
}

export type UserHistory = Awaited<ReturnType<typeof getUserHistory>>[0];
