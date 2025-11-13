import { UserDashboardOverviewSSR } from "./_components/user-dashboard-overview-ssr";
import { getUserDashboardSSR } from "@/data/get-user-dashboard-ssr";

export default async function Dashboard() {
  const data = await getUserDashboardSSR();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Your Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your GPT usage and conversation activity
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-6">
        <UserDashboardOverviewSSR data={data} />
      </div>
    </div>
  );
}