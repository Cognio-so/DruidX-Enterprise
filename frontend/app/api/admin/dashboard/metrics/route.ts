import { NextResponse } from "next/server";
import {
  getDashboardMetrics,
  getUserGrowthData,
  getConversationTrends,
  getGptUsageStats,
  getRecentActivity,
} from "@/data/get-dashboard-metrics";

export async function GET() {
  try {
    const [metrics, userGrowth, conversationTrends, gptUsage, recentActivity] =
      await Promise.all([
        getDashboardMetrics(),
        getUserGrowthData(),
        getConversationTrends(),
        getGptUsageStats(),
        getRecentActivity(),
      ]);

    return NextResponse.json({
      metrics,
      userGrowth,
      conversationTrends,
      gptUsage,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching admin dashboard metrics:", error);
    // Return default/empty data instead of error to prevent page crashes
    return NextResponse.json(
      {
        metrics: {
          totalUsers: 0,
          totalGpts: 0,
          totalConversations: 0,
          totalMessages: 0,
          activeUsers: 0,
          recentConversations: 0,
          userGrowth: 0,
          conversationGrowth: 0,
        },
        userGrowth: [],
        conversationTrends: [],
        gptUsage: [],
        recentActivity: {
          recentConversations: [],
          recentUsers: [],
          recentGpts: [],
        },
      },
      { status: 200 } // Return 200 with empty data instead of error
    );
  }
}

