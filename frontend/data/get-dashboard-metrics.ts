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

// Default metrics when database is unavailable
const defaultMetrics: DashboardMetrics = {
  totalUsers: 0,
  totalGpts: 0,
  totalConversations: 0,
  totalMessages: 0,
  activeUsers: 0,
  recentConversations: 0,
  userGrowth: 0,
  conversationGrowth: 0,
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const session = await requireAdmin();
    
    // Get current admin's user ID
    const currentAdminId = session.user.id;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get basic counts - filter by current admin's GPTs and conversations
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
    // Count users who have conversations with admin's GPTs
    prisma.user.count({
      where: {
        conversations: {
          some: {
            gpt: { userId: currentAdminId }
          }
        }
      }
    }),
    // Count GPTs created by current admin
    prisma.gpt.count({
      where: { userId: currentAdminId }
    }),
    // Count conversations using admin's GPTs
    prisma.conversation.count({
      where: {
        gpt: { userId: currentAdminId }
      }
    }),
    // Count messages in conversations using admin's GPTs
    prisma.message.count({
      where: {
        conversation: {
          gpt: { userId: currentAdminId }
        }
      }
    }),
    // Count active users who have conversations with admin's GPTs
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
    // Count recent conversations using admin's GPTs
    prisma.conversation.count({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        gpt: { userId: currentAdminId }
      },
    }),
    // Count users who started conversations with admin's GPTs in last month
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
    // Count conversations using admin's GPTs in last month
    prisma.conversation.count({
      where: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
        gpt: { userId: currentAdminId }
      },
    }),
  ]);

    // Calculate growth percentages
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
  } catch (error) {
    // Handle database connection errors gracefully
    if (error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001") ||
         (error as any).code === "P1001")) {
      console.error("Database connection error:", error);
      return defaultMetrics;
    }
    // Re-throw other errors
    throw error;
  }
}

export async function getUserGrowthData(): Promise<ChartData[]> {
  try {
    const session = await requireAdmin();
    
    // Get current admin's user ID
    const currentAdminId = session.user.id;

    const now = new Date();
    const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000);

    // Get users who have conversations with admin's GPTs
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

  // Group by month
  const monthlyData: { [key: string]: number } = {};
  
  userData.forEach(user => {
    const month = user.createdAt.toISOString().slice(0, 7); // YYYY-MM format
    monthlyData[month] = (monthlyData[month] || 0) + 1;
  });

    // Fill in missing months with 0
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
  } catch (error) {
    // Handle database connection errors gracefully
    if (error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001") ||
         (error as any).code === "P1001")) {
      console.error("Database connection error:", error);
      // Return empty chart data
      const now = new Date();
      const result: ChartData[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 30 * 24 * 60 * 60 * 1000);
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        result.push({ name: monthName, value: 0 });
      }
      return result;
    }
    throw error;
  }
}

export async function getConversationTrends(): Promise<ChartData[]> {
  try {
    const session = await requireAdmin();
    
    // Get current admin's user ID
    const currentAdminId = session.user.id;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get conversations using admin's GPTs
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
    if (error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001") ||
         (error as any).code === "P1001")) {
      console.error("Database connection error:", error);
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
    throw error;
  }
}

export async function getGptUsageStats(): Promise<ChartData[]> {
  try {
    const session = await requireAdmin();
    
    // Get current admin's user ID
    const currentAdminId = session.user.id;

    // Get GPTs created by current admin
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

export async function getRecentActivity() {
  try {
    const session = await requireAdmin();
    
    // Get current admin's user ID
    const currentAdminId = session.user.id;

    const [recentConversations, recentUsers, recentGpts] = await Promise.all([
    // Get recent conversations using admin's GPTs
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
    // Get recent users who have conversations with admin's GPTs
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
    // Get recent GPTs created by current admin
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
  } catch (error) {
    // Handle database connection errors gracefully
    if (error instanceof Error && 
        (error.message.includes("Can't reach database server") ||
         error.message.includes("P1001") ||
         (error as any).code === "P1001")) {
      console.error("Database connection error:", error);
      return {
        recentConversations: [],
        recentUsers: [],
        recentGpts: [],
      };
    }
    throw error;
  }
}
