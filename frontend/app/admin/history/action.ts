'use server';

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/data/requireAdmin";
import { requireUser } from "@/data/requireUser";
import { revalidatePath } from "next/cache";

export interface ConversationData {
  title: string;
  gptId: string;
  sessionId: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    uploadedDocs?: Array<{ url: string; filename: string; type: string }>;
    imageUrls?: string[];
    videoUrls?: string[];
  }>;
}

export async function saveConversation(conversationData: ConversationData) {
  try {
    const { user } = await requireUser();
    
    // Check if conversation exists for this session
    const existing = await prisma.conversation.findFirst({
      where: { sessionId: conversationData.sessionId }
    });
    
    if (existing) {
      // Update existing conversation
      const conversation = await prisma.conversation.update({
        where: { id: existing.id },
        data: {
          updatedAt: new Date(),
          messages: {
            deleteMany: {}, // Clear old messages
            create: conversationData.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              uploadedDocs: msg.uploadedDocs ?? undefined,
              imageUrls: msg.imageUrls ?? undefined,
              videoUrls: msg.videoUrls ?? undefined,
            }))
          }
        },
        include: {
          messages: true,
          gpt: {
            select: {
              name: true,
              image: true
            }
          }
        }
      });

      return { success: true, conversation };
    } else {
      // Create new conversation
      const conversation = await prisma.conversation.create({
        data: {
          title: conversationData.title,
          gptId: conversationData.gptId,
          userId: user.id,
          sessionId: conversationData.sessionId,
          messages: {
            create: conversationData.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              uploadedDocs: msg.uploadedDocs ?? undefined,
              imageUrls: msg.imageUrls ?? undefined,
              videoUrls: msg.videoUrls ?? undefined,
            }))
          }
        },
        include: {
          messages: true,
          gpt: {
            select: {
              name: true,
              image: true
            }
          }
        }
      });

      return { success: true, conversation };
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
    return { success: false, error: 'Failed to save conversation' };
  }
}

export async function deleteConversation(conversationId: string) {
  try {
    const session = await requireAdmin();
    
    if (!session?.user) {
      return { success: false, error: "Unauthorized" };
    }
    
    const currentAdminId = session.user.id;
    
    // Verify conversation belongs to admin's GPTs or was created by admin
    const existingConversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [
          { userId: currentAdminId },
          { gpt: { userId: currentAdminId } }
        ]
      }
    });

    if (!existingConversation) {
      return { success: false, error: "Conversation not found or you don't have permission to delete it" };
    }
    
    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    revalidatePath('/admin/history');
    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return { success: false, error: 'Failed to delete conversation' };
  }
}

export async function deleteHistory(id: string) {
  return deleteConversation(id);
}

export async function saveAdminHistory(history: ConversationData) {
  return saveConversation(history);
}

export async function getConversation(conversationId: string, isAdmin: boolean = false) {
  try {
    const { getConversationById } = await import("@/data/get-conversation");
    const conversation = await getConversationById(conversationId, isAdmin);
    
    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    return { success: true, conversation };
  } catch (error) {
    console.error("Error fetching conversation:", error);
    return { success: false, error: "Failed to fetch conversation" };
  }
}