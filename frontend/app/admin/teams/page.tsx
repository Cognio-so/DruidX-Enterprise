import { getTeamMembers } from "@/data/get-team-members";
import { getTeamGroups } from "@/data/get-team-groups";
import { getAdminGpts } from "@/data/get-admin-gpts";
import { Suspense } from "react";
import TeamsLoading from "./_components/teams-loading";
import TeamsPageClient from "./_components/teams-page-client";

async function TeamsTableWrapper() {
  const [teamMembers, groups, adminGpts] = await Promise.all([
    getTeamMembers(),
    getTeamGroups(),
    getAdminGpts(),
  ]);

  return (
    <>
      <Suspense fallback={<TeamsLoading />}>
        <TeamsPageClient 
          teamMembers={teamMembers} 
          groups={groups}
          adminGpts={adminGpts}
        />
      </Suspense>
    </>
  );
}

export default function TeamsPage() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="space-y-4">
        <TeamsTableWrapper />
      </div>
    </div>
  );
}
