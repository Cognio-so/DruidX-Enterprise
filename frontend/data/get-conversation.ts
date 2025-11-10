import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";
import { requireUser } from "./requireUser";

export async function getConversationById(conversationId: string, isAdmin: boolean = false) {
  if (isAdmin) {
    const session = await requireAdmin();
    const currentAdminId = session.user.id;

    // Get conversation and verify it belongs to admin's GPTs or was created by admin
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { userId: currentAdminId },
          { gpt: { userId: currentAdminId } }
        ]
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc'
          },
          select: {
            role: true,
            content: true,
            timestamp: true,
          }
        },
        gpt: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });

    return conversation;
  } else {
    const { user } = await requireUser();

    // Get conversation and verify it belongs to the user
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.id
      },
      include: {
        messages: {
          orderBy: {
            timestamp: 'asc'
          },
          select: {
            role: true,
            content: true,
            timestamp: true,
          }
        },
        gpt: {
          select: {
            id: true,
            name: true,
            image: true,
          }
        }
      }
    });

    return conversation;
  }
}

export type Conversation = Awaited<ReturnType<typeof getConversationById>>;

