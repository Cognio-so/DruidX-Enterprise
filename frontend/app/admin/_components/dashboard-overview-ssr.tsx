import { SectionCards } from "./section-cards";
import { ChartAreaInteractive } from "./chart-area-interactive";
import { RecentActivityTable } from "./recent-activity-table";
import { AdminDashboardData } from "@/data/get-admin-dashboard-ssr";

interface DashboardOverviewSSRProps {
  data: AdminDashboardData;
}

export function DashboardOverviewSSR({ data }: DashboardOverviewSSRProps) {
  return (
    <div className="space-y-6">
      <SectionCards metrics={data.metrics} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartAreaInteractive
          data={data.userGrowth}
          title="User Growth"
          description="New user registrations over the last 6 months"
          color="hsl(var(--primary))"
        />

        <ChartAreaInteractive
          data={data.conversationTrends}
          title="Conversation Trends"
          description="Daily conversation volume over the last 30 days"
          color="hsl(var(--chart-2))"
        />
      </div>

      <ChartAreaInteractive
        data={data.gptUsage}
        title="GPT Usage Statistics"
        description="Most popular GPTs by conversation count"
        color="hsl(var(--chart-3))"
      />

      <RecentActivityTable data={data.recentActivity} />
    </div>
  );
}

