'use server';

import prisma from "@/lib/prisma";
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

export async function saveUserConversation(conversationData: ConversationData) {
  try {
    const { user } = await requireUser();
    
    // Check if conversation exists for this session and user
    const existing = await prisma.conversation.findFirst({
      where: { 
        sessionId: conversationData.sessionId,
        userId: user.id
      }
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
    console.error('Error saving user conversation:', error);
    return { success: false, error: 'Failed to save conversation' };
  }
}

export async function deleteUserConversation(conversationId: string) {
  try {
    const { user } = await requireUser();
    
    // Only delete if conversation belongs to current user
    await prisma.conversation.delete({
      where: { 
        id: conversationId,
        userId: user.id // Ensure user owns this conversation
      }
    });

    revalidatePath('/history');
    return { success: true };
  } catch (error) {
    console.error('Error deleting user conversation:', error);
    return { success: false, error: 'Failed to delete conversation' };
  }
}
