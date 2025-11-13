import { UserSectionCards } from "./user-section-cards";
import { ChartAreaInteractive } from "@/app/admin/_components/chart-area-interactive";
import { UserRecentActivityTable } from "./user-recent-activity-table";
import { UserDashboardData } from "@/data/get-user-dashboard-ssr";

interface UserDashboardOverviewSSRProps {
  data: UserDashboardData;
}

export function UserDashboardOverviewSSR({ data }: UserDashboardOverviewSSRProps) {
  return (
    <div className="space-y-6">
      <UserSectionCards metrics={data.metrics} />

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

      <UserRecentActivityTable data={data.recentActivity} />
    </div>
  );
}

