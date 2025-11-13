import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

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

export interface UserDashboardData {
  metrics: UserDashboardMetrics;
  conversationTrends: ChartData[];
  gptUsage: ChartData[];
  recentActivity: {
    recentConversations: any[];
    recentGpts: any[];
  };
}

async function getUserDashboardMetricsInternal(userId: string): Promise<UserDashboardMetrics> {

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // Fetch GPT assignments sequentially to reduce connection pressure
  const createdGpts = await prisma.gpt.findMany({
    where: { userId },
    select: { id: true }
  });
  
  const individualAssignments = await prisma.assignGpt.findMany({
    where: { userId },
    select: { gptId: true }
  });
  
  const groupAssignments = await prisma.groupGptAssignment.findMany({
    where: {
      group: {
        members: {
          some: {
            userId
          }
        }
      }
    },
    select: { gptId: true }
  });

  const createdGptIds = createdGpts.map(gpt => gpt.id);
  const individualGptIds = individualAssignments.map(assign => assign.gptId);
  const groupGptIds = groupAssignments.map(assign => assign.gptId);
  const allGptIds = [...new Set([...createdGptIds, ...individualGptIds, ...groupGptIds])];

  // Fetch counts and most used GPT sequentially
  const totalConversations = await prisma.conversation.count({
    where: { userId }
  });
  
  const totalMessages = await prisma.message.count({
    where: {
      conversation: {
        userId
      }
    }
  });
  
  const recentConversations = await prisma.conversation.count({
    where: {
      userId,
      createdAt: {
        gte: sevenDaysAgo,
      },
    },
  });
  
  const conversationsLastMonth = await prisma.conversation.count({
    where: {
      userId,
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });
  
  const mostUsedGptData = await prisma.conversation.groupBy({
    by: ['gptId'],
    where: { userId },
    _count: { gptId: true },
    orderBy: { _count: { gptId: 'desc' } },
    take: 1
  });

  let mostUsedGpt = null;
  if (mostUsedGptData.length > 0 && mostUsedGptData[0].gptId) {
    const gpt = await prisma.gpt.findUnique({
      where: { id: mostUsedGptData[0].gptId },
      select: { name: true }
    });
    mostUsedGpt = gpt?.name || null;
  }

  const conversationGrowth = totalConversations > 0 ? (conversationsLastMonth / totalConversations) * 100 : 0;
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
}

async function getUserConversationTrendsInternal(userId: string): Promise<ChartData[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const conversationData = await prisma.conversation.findMany({
    where: {
      userId,
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

  const dailyData: { [key: string]: number } = {};
  
  conversationData.forEach(conversation => {
    const day = conversation.createdAt.toISOString().slice(0, 10);
    dailyData[day] = (dailyData[day] || 0) + 1;
  });

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
}

async function getUserGptUsageStatsInternal(userId: string): Promise<ChartData[]> {
  const gptStats = await prisma.conversation.groupBy({
    by: ['gptId'],
    where: { userId },
    _count: { gptId: true },
    orderBy: { _count: { gptId: 'desc' } },
    take: 10,
  });

  // Only fetch GPT names if we have stats
  if (gptStats.length === 0) {
    return [];
  }

  const gptIds = gptStats.map(stat => stat.gptId).filter(id => id !== null);
  
  // Fetch GPT names sequentially if needed
  if (gptIds.length === 0) {
    return gptStats.map(stat => ({
      name: 'Unknown GPT',
      value: stat._count.gptId,
    }));
  }

  const gpts = await prisma.gpt.findMany({
    where: { id: { in: gptIds } },
    select: { id: true, name: true }
  });

  const gptMap = new Map(gpts.map(gpt => [gpt.id, gpt.name]));

  return gptStats.map(stat => ({
    name: gptMap.get(stat.gptId) || 'Unknown GPT',
    value: stat._count.gptId,
  }));
}

async function getUserRecentActivityInternal(userId: string) {
  // Fetch sequentially to avoid connection pool exhaustion
  const recentConversations = await prisma.conversation.findMany({
    where: { userId },
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
  });
  
  const recentGpts = await prisma.gpt.findMany({
    where: {
      OR: [
        { userId },
        { assignedToUsers: { some: { userId } } },
        {
          groupAssignments: {
            some: {
              group: {
                members: {
                  some: {
                    userId
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
            where: { userId }
          },
        },
      },
    },
  });

  return {
    recentConversations,
    recentGpts,
  };
}

export async function getUserDashboardSSR(): Promise<UserDashboardData> {
  const { user } = await requireUser();
  const userId = user.id;

  // Fetch in sequence to avoid connection pool exhaustion
  const metrics = await getUserDashboardMetricsInternal(userId);
  const conversationTrends = await getUserConversationTrendsInternal(userId);
  const gptUsage = await getUserGptUsageStatsInternal(userId);
  const recentActivity = await getUserRecentActivityInternal(userId);

  return {
    metrics,
    conversationTrends,
    gptUsage,
    recentActivity,
  };
}

