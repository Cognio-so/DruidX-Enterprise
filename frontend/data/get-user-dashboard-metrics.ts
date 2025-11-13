import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";
import { Prisma } from "@/app/generated/prisma";

export interface UserDashboardMetrics {
  totalAssignedGpts: number;
  totalConversations: number;
  totalMessages: number;
  recentConversations: number;
  conversationGrowth: number;
  mostUsedGpt: string | null;
  averageMessagesPerConversation: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

// Default metrics when database is unavailable
const defaultUserMetrics: UserDashboardMetrics = {
  totalAssignedGpts: 0,
  totalConversations: 0,
  totalMessages: 0,
  recentConversations: 0,
  conversationGrowth: 0,
  mostUsedGpt: null,
  averageMessagesPerConversation: 0,
};

export async function getUserDashboardMetrics(): Promise<UserDashboardMetrics> {
  try {
    const { user } = await requireUser();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get user's assigned GPTs (created by user + individually assigned + group-assigned)
    const [createdGpts, individualAssignments, groupAssignments] = await Promise.all([
    prisma.gpt.findMany({
      where: { userId: user.id },
      select: { id: true }
    }),
    prisma.assignGpt.findMany({
      where: { userId: user.id },
      select: { gptId: true }
    }),
    prisma.groupGptAssignment.findMany({
      where: {
        group: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      },
      select: { gptId: true }
    })
    ]);

    const createdGptIds = createdGpts.map(gpt => gpt.id);
    const individualGptIds = individualAssignments.map(assign => assign.gptId);
    const groupGptIds = groupAssignments.map(assign => assign.gptId);
    const allGptIds = [...new Set([...createdGptIds, ...individualGptIds, ...groupGptIds])]; // Remove duplicates

    // Get basic counts for this user
    const [
      totalConversations,
      totalMessages,
      recentConversations,
      conversationsLastMonth,
      mostUsedGptData
    ] = await Promise.all([
    prisma.conversation.count({
      where: { userId: user.id }
    }),
    prisma.message.count({
      where: {
        conversation: {
          userId: user.id
        }
      }
    }),
    prisma.conversation.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: sevenDaysAgo,
        },
      },
    }),
    prisma.conversation.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    }),
    prisma.conversation.groupBy({
      by: ['gptId'],
      where: { userId: user.id },
      _count: { gptId: true },
      orderBy: { _count: { gptId: 'desc' } },
      take: 1
    })
    ]);

    // Get most used GPT name
    let mostUsedGpt = null;
    if (mostUsedGptData.length > 0) {
      const gpt = await prisma.gpt.findUnique({
        where: { id: mostUsedGptData[0].gptId },
        select: { name: true }
      });
      mostUsedGpt = gpt?.name || null;
    }

    // Calculate growth percentage
    const conversationGrowth = totalConversations > 0 ? (conversationsLastMonth / totalConversations) * 100 : 0;

    // Calculate average messages per conversation
    const averageMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

    return {
      totalAssignedGpts: allGptIds.length,
      totalConversations,
      totalMessages,
      recentConversations,
      conversationGrowth: Math.round(conversationGrowth * 100) / 100,
      mostUsedGpt,
      averageMessagesPerConversation: Math.round(averageMessagesPerConversation * 100) / 100,
    };
  } catch (error) {
    // Handle database connection errors gracefully
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001"
    ) {
      console.error("Database connection error: Cannot reach database server");
      return defaultUserMetrics;
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001")))
    ) {
      console.error("Database connection error: Cannot reach database server");
      return defaultUserMetrics;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function getUserConversationTrends(): Promise<ChartData[]> {
  try {
    const { user } = await requireUser();

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const conversationData = await prisma.conversation.findMany({
    where: {
      userId: user.id,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group by day
  const dailyData: { [key: string]: number } = {};
  
  conversationData.forEach(conversation => {
    const day = conversation.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD format
    dailyData[day] = (dailyData[day] || 0) + 1;
  });

    // Fill in missing days with 0
    const result: ChartData[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const day = date.toISOString().slice(0, 10);
      const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      result.push({
        name: dayName,
        value: dailyData[day] || 0,
        date: day,
      });
    }

    return result;
  } catch (error) {
    // Handle database connection errors gracefully
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001"
    ) {
      console.error("Database connection error: Cannot reach database server");
      // Return empty chart data
      const now = new Date();
      const result: ChartData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        result.push({ name: dayName, value: 0 });
      }
      return result;
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001")))
    ) {
      console.error("Database connection error: Cannot reach database server");
      const now = new Date();
      const result: ChartData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        result.push({ name: dayName, value: 0 });
      }
      return result;
    }
    throw error;
  }
}

export async function getUserGptUsageStats(): Promise<ChartData[]> {
  try {
    const { user } = await requireUser();

    const gptStats = await prisma.conversation.groupBy({
    by: ['gptId'],
    where: { userId: user.id },
    _count: { gptId: true },
    orderBy: { _count: { gptId: 'desc' } },
    take: 10,
  });

  // Get GPT names
  const gptIds = gptStats.map(stat => stat.gptId);
  const gpts = await prisma.gpt.findMany({
    where: { id: { in: gptIds } },
    select: { id: true, name: true }
  });

  const gptMap = new Map(gpts.map(gpt => [gpt.id, gpt.name]));

    return gptStats.map(stat => ({
      name: gptMap.get(stat.gptId) || 'Unknown GPT',
      value: stat._count.gptId,
    }));
  } catch (error) {
    // Handle database connection errors gracefully
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001"
    ) {
      console.error("Database connection error: Cannot reach database server");
      return [];
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001")))
    ) {
      console.error("Database connection error: Cannot reach database server");
      return [];
    }
    throw error;
  }
}

export async function getUserRecentActivity() {
  try {
    const { user } = await requireUser();

    const [recentConversations, recentGpts] = await Promise.all([
    prisma.conversation.findMany({
      where: { userId: user.id },
      take: 5,
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        title: true,
        gptId: true,
        updatedAt: true,
        gpt: {
          select: {
            name: true,
            image: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    }),
    prisma.gpt.findMany({
      where: {
        OR: [
          { userId: user.id },
          { assignedToUsers: { some: { userId: user.id } } },
          {
            groupAssignments: {
              some: {
                group: {
                  members: {
                    some: {
                      userId: user.id
                    }
                  }
                }
              }
            }
          }
        ]
      },
      take: 5,
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        _count: {
          select: {
            conversations: {
              where: { userId: user.id }
            },
          },
        },
      },
    }),
  ]);

    return {
      recentConversations,
      recentGpts,
    };
  } catch (error) {
    // Handle database connection errors gracefully
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P1001"
    ) {
      console.error("Database connection error: Cannot reach database server");
      return {
        recentConversations: [],
        recentGpts: [],
      };
    }
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      (error instanceof Error &&
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001")))
    ) {
      console.error("Database connection error: Cannot reach database server");
      return {
        recentConversations: [],
        recentGpts: [],
      };
    }
    throw error;
  }
}
