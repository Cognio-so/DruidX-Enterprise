"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamsTable from "./teams-table";
import GroupsGrid from "./groups-grid";
import { TeamMember } from "@/data/get-team-members";
import { TeamGroup } from "@/data/get-team-groups";

interface TeamsTabsProps {
  teamMembers: TeamMember[];
  groups: TeamGroup[];
  searchTerm: string;
  roleFilter: string;
  statusFilter: string;
  onGroupPreview: (groupId: string) => void;
}

export default function TeamsTabs({
  teamMembers,
  groups,
  searchTerm,
  roleFilter,
  statusFilter,
  onGroupPreview,
}: TeamsTabsProps) {
  return (
    <Tabs defaultValue="users" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="users">Users</TabsTrigger>
        <TabsTrigger value="groups">Groups</TabsTrigger>
      </TabsList>
      <TabsContent value="users" className="mt-6">
        <TeamsTable
          teamMembers={teamMembers}
          searchTerm={searchTerm}
          roleFilter={roleFilter}
          statusFilter={statusFilter}
        />
      </TabsContent>
      <TabsContent value="groups" className="mt-6">
        <GroupsGrid groups={groups} onPreview={onGroupPreview} />
      </TabsContent>
    </Tabs>
  );
}

