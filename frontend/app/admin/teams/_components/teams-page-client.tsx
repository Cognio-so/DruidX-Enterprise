"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TeamMember } from "@/data/get-team-members";
import { TeamGroup } from "@/data/get-team-groups";
import { AdminGpt } from "@/data/get-admin-gpts";
import TeamsHeader from "./teams-header";
import TeamsTabs from "./teams-tabs";
import GroupPreviewDialog from "./group-preview-dialog";

interface TeamsPageClientProps {
  teamMembers: TeamMember[];
  groups: TeamGroup[];
  adminGpts: AdminGpt[];
}

export default function TeamsPageClient({ teamMembers, groups, adminGpts }: TeamsPageClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [previewGroupId, setPreviewGroupId] = useState<string | null>(null);
  const router = useRouter();

  const handleClearFilters = () => {
    setSearchTerm("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const handleGroupPreview = (groupId: string) => {
    setPreviewGroupId(groupId);
  };

  const handleGroupCreated = () => {
    router.refresh();
  };

  return (
    <>
      <TeamsHeader
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        onSearchChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onClearFilters={handleClearFilters}
        onGroupCreated={handleGroupCreated}
      />
      
      <TeamsTabs
        teamMembers={teamMembers}
        groups={groups}
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onGroupPreview={handleGroupPreview}
      />

      <GroupPreviewDialog
        groupId={previewGroupId}
        open={!!previewGroupId}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewGroupId(null);
          }
        }}
        teamMembers={teamMembers}
        adminGpts={adminGpts}
      />
    </>
  );
}
