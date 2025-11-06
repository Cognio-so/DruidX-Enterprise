import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export async function getAdminHistory() {
  const session = await requireAdmin();
  
  // Get current admin's user ID
  const currentAdminId = session.user.id;

  // Get conversations from GPTs created by current admin OR conversations created by current admin
  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { userId: currentAdminId },  // Conversations created by current admin
        { gpt: { userId: currentAdminId } }  // Conversations using GPTs created by current admin
      ]
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        }
      },
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

export type AdminHistory = Awaited<ReturnType<typeof getAdminHistory>>[0];