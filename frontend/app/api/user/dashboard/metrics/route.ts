import { NextResponse } from "next/server";
import {
  getUserDashboardMetrics,
  getUserConversationTrends,
  getUserGptUsageStats,
  getUserRecentActivity,
} from "@/data/get-user-dashboard-metrics";

export async function GET() {
  try {
    const [metrics, conversationTrends, gptUsage, recentActivity] =
      await Promise.all([
        getUserDashboardMetrics(),
        getUserConversationTrends(),
        getUserGptUsageStats(),
        getUserRecentActivity(),
      ]);

    return NextResponse.json({
      metrics,
      conversationTrends,
      gptUsage,
      recentActivity,
    });
  } catch (error) {
    console.error("Error fetching user dashboard metrics:", error);
    // Return default/empty data instead of error to prevent page crashes
    return NextResponse.json(
      {
        metrics: {
          totalAssignedGpts: 0,
          totalConversations: 0,
          totalMessages: 0,
          recentConversations: 0,
          conversationGrowth: 0,
          mostUsedGpt: null,
          averageMessagesPerConversation: 0,
        },
        conversationTrends: [],
        gptUsage: [],
        recentActivity: {
          recentConversations: [],
          recentGpts: [],
        },
      },
      { status: 200 } // Return 200 with empty data instead of error
    );
  }
}

