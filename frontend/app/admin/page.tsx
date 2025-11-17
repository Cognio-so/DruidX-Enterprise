import { buttonVariants } from "@/components/ui/button";
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { DashboardOverviewSSR } from "./_components/dashboard-overview-ssr";
import { getAdminDashboardSSR } from "@/data/get-admin-dashboard-ssr";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default async function AdminPage() {
  const data = await getAdminDashboardSSR();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3 p-6">
        <div className="flex items-start gap-3">
          <SidebarTrigger className="h-9 w-9 md:hidden" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Monitor your platform&apos;s performance and user activity
        </p>
        <Link
          href="/admin/gpts/create-gpt"
          className={buttonVariants({
            variant: "default",
            className: "inline-flex items-center gap-2 w-full sm:w-auto justify-center",
          })}
        >
          <PlusIcon className="w-4 h-4" />
          Create GPT
        </Link>
      </div>


      {/* Main Dashboard Content */}
      <div className="px-6">
        <DashboardOverviewSSR data={data} />
      </div>
    </div>
  );
}
