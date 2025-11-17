"use client";

import { toast } from "sonner";
import InviteMember from "./invite-member";
import CreateGroupDialog from "./create-group-dialog";
import TeamsSearch from "./teams-search";
import TeamsFilter from "./teams-filter";
import { SidebarTrigger } from "@/components/ui/sidebar";

interface TeamsHeaderProps {
  searchTerm: string;
  roleFilter: string;
  onSearchChange: (value: string) => void;
  onRoleFilterChange: (role: string) => void;
  onClearFilters: () => void;
  onGroupCreated?: () => void;
}

export default function TeamsHeader({
  searchTerm,
  roleFilter,
  onSearchChange,
  onRoleFilterChange,
  onClearFilters,
  onGroupCreated,
}: TeamsHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <SidebarTrigger className="h-9 w-9 md:hidden" />
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-primary">
              Teams
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage team members and their access permissions
          </p>
        </div>
        <div className="flex-shrink-0 flex gap-2">
          <CreateGroupDialog onGroupCreated={onGroupCreated} />
          <InviteMember onInviteSent={(email, role) => {
            toast.success(`Invitation sent to ${email} as ${role}`)
          }} />
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <TeamsSearch searchTerm={searchTerm} onSearchChange={onSearchChange} />
        <TeamsFilter
          roleFilter={roleFilter}
          onRoleFilterChange={onRoleFilterChange}
          onClearFilters={onClearFilters}
        />
      </div>
    </div>
  );
}
