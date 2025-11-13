"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSectionCards } from "./user-section-cards";
import { ChartAreaInteractive } from "@/app/admin/_components/chart-area-interactive";
import { UserRecentActivityTable } from "./user-recent-activity-table";
import { UserDashboardMetrics, ChartData } from "@/data/get-user-dashboard-metrics";

interface UserDashboardData {
  metrics: UserDashboardMetrics;
  conversationTrends: ChartData[];
  gptUsage: ChartData[];
  recentActivity: {
    recentConversations: any[];
    recentGpts: any[];
  };
}

// Loading skeleton components
function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Main dashboard component
export function UserDashboardOverview() {
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/user/dashboard/metrics");
        
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard data");
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data");
        // Set default empty data to prevent crashes
        setData({
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
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <MetricsSkeleton />
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <TableSkeleton />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <UserSectionCards metrics={data.metrics} />

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartAreaInteractive
          data={data.conversationTrends}
          title="Your Conversation Activity"
          description="Daily conversation volume over the last 30 days"
          color="hsl(var(--chart-1))"
        />
        
        <ChartAreaInteractive
          data={data.gptUsage}
          title="Your GPT Usage"
          description="Most used GPTs by conversation count"
          color="hsl(var(--chart-2))"
        />
      </div>

      {/* Recent Activity Tables */}
      <UserRecentActivityTable data={data.recentActivity} />
    </div>
  );
}
