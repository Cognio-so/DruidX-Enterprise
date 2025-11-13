import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export interface DashboardMetrics {
  totalUsers: number;
  totalGpts: number;
  totalConversations: number;
  totalMessages: number;
  activeUsers: number;
  recentConversations: number;
  userGrowth: number;
  conversationGrowth: number;
}

export interface ChartData {
  name: string;
  value: number;
  date?: string;
}

export interface AdminDashboardData {
  metrics: DashboardMetrics;
  userGrowth: ChartData[];
  conversationTrends: ChartData[];
  gptUsage: ChartData[];
  recentActivity: {
    recentConversations: any[];
    recentUsers: any[];
    recentGpts: any[];
  };
}

async function getDashboardMetricsInternal(currentAdminId: string): Promise<DashboardMetrics> {

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    totalGpts,
    totalConversations,
    totalMessages,
    activeUsers,
    recentConversations,
    usersLastMonth,
    conversationsLastMonth,
  ] = await Promise.all([
    prisma.user.count({
      where: {
        conversations: {
          some: {
            gpt: { userId: currentAdminId }
          }
        }
      }
    }),
    prisma.gpt.count({
      where: { userId: currentAdminId }
    }),
    prisma.conversation.count({
      where: {
        gpt: { userId: currentAdminId }
      }
    }),
    prisma.message.count({
      where: {
        conversation: {
          gpt: { userId: currentAdminId }
        }
      }
    }),
    prisma.user.count({
      where: {
        sessions: {
          some: {
            expiresAt: {
              gt: now,
            },
          },
        },
        conversations: {
          some: {
            gpt: { userId: currentAdminId }
          }
        }
      },
    }),
    prisma.conversation.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        gpt: { userId: currentAdminId }
      },
    }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        conversations: {
          some: {
            gpt: { userId: currentAdminId }
          }
        }
      },
    }),
    prisma.conversation.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        gpt: { userId: currentAdminId }
      },
    }),
  ]);

  const userGrowth = totalUsers > 0 ? (usersLastMonth / totalUsers) * 100 : 0;
  const conversationGrowth = totalConversations > 0 ? (conversationsLastMonth / totalConversations) * 100 : 0;

  return {
    totalUsers,
    totalGpts,
    totalConversations,
    totalMessages,
    activeUsers,
    recentConversations,
    userGrowth: Math.round(userGrowth * 100) / 100,
    conversationGrowth: Math.round(conversationGrowth * 100) / 100,
  };
}

async function getUserGrowthDataInternal(currentAdminId: string): Promise<ChartData[]> {

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

  const userData = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: sixMonthsAgo,
      },
      conversations: {
        some: {
          gpt: { userId: currentAdminId }
        }
      }
    },
    select: {
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  const monthlyData: { [key: string]: number } = {};
  
  userData.forEach(user => {
    const month = user.createdAt.toISOString().slice(0, 7);
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

  const result: ChartData[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
    const month = date.toISOString().slice(0, 7);
    const monthName = date.toLocaleDateString('en-US', { month: 'short' });
    
    result.push({
      name: monthName,
      value: monthlyData[month] || 0,
      date: month,
    });
  }

  return result;
}

async function getConversationTrendsInternal(currentAdminId: string): Promise<ChartData[]> {

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const conversationData = await prisma.conversation.findMany({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
      gpt: { userId: currentAdminId }
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

async function getGptUsageStatsInternal(currentAdminId: string): Promise<ChartData[]> {

  const gptStats = await prisma.gpt.findMany({
    where: { userId: currentAdminId },
    include: {
      _count: {
        select: {
          conversations: true,
        },
      },
    },
    orderBy: {
      conversations: {
        _count: 'desc',
      },
    },
    take: 10,
  });

  return gptStats.map(gpt => ({
    name: gpt.name,
    value: gpt._count.conversations,
  }));
}

async function getRecentActivityInternal(currentAdminId: string) {

  const [recentConversations, recentUsers, recentGpts] = await Promise.all([
    prisma.conversation.findMany({
      where: {
        gpt: { userId: currentAdminId }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
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
    prisma.user.findMany({
      where: {
        conversations: {
          some: {
            gpt: { userId: currentAdminId }
          }
        }
      },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.gpt.findMany({
      where: { userId: currentAdminId },
      take: 5,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            conversations: true,
          },
        },
      },
    }),
  ]);

  return {
    recentConversations,
    recentUsers,
    recentGpts,
  };
}

export async function getAdminDashboardSSR(): Promise<AdminDashboardData> {
  const session = await requireAdmin();
  const currentAdminId = session.user.id;

  // Fetch in sequence to avoid connection pool exhaustion
  const metrics = await getDashboardMetricsInternal(currentAdminId);
  const userGrowth = await getUserGrowthDataInternal(currentAdminId);
  const conversationTrends = await getConversationTrendsInternal(currentAdminId);
  const gptUsage = await getGptUsageStatsInternal(currentAdminId);
  const recentActivity = await getRecentActivityInternal(currentAdminId);

  return {
    metrics,
    userGrowth,
    conversationTrends,
    gptUsage,
    recentActivity,
  };
}

