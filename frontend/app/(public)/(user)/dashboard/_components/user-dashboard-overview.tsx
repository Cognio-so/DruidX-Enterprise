import { Suspense } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { UserSectionCards } from "./user-section-cards";
import { ChartAreaInteractive } from "@/app/admin/_components/chart-area-interactive";
import { UserRecentActivityTable } from "./user-recent-activity-table";
import { 
  getUserDashboardMetrics, 
  getUserConversationTrends, 
  getUserGptUsageStats,
  getUserRecentActivity 
} from "@/data/get-user-dashboard-metrics";

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

// Async data fetching components
async function MetricsCards() {
  const metrics = await getUserDashboardMetrics();
  return <UserSectionCards metrics={metrics} />;
}

async function ConversationTrendsChart() {
  const data = await getUserConversationTrends();
  return (
    <ChartAreaInteractive
      data={data}
      title="Your Conversation Activity"
      description="Daily conversation volume over the last 30 days"
      color="hsl(var(--chart-1))"
    />
  );
}

async function GptUsageChart() {
  const data = await getUserGptUsageStats();
  return (
    <ChartAreaInteractive
      data={data}
      title="Your GPT Usage"
      description="Most used GPTs by conversation count"
      color="hsl(var(--chart-2))"
    />
  );
}

async function RecentActivityData() {
  const data = await getUserRecentActivity();
  return <UserRecentActivityTable data={data} />;
}

// Main dashboard component
export function UserDashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <Suspense fallback={<MetricsSkeleton />}>
        <MetricsCards />
      </Suspense>

      {/* Charts Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<ChartSkeleton />}>
          <ConversationTrendsChart />
        </Suspense>
        
        <Suspense fallback={<ChartSkeleton />}>
          <GptUsageChart />
        </Suspense>
      </div>

      {/* Recent Activity Tables */}
      <Suspense fallback={<TableSkeleton />}>
        <RecentActivityData />
      </Suspense>
    </div>
  );
}
