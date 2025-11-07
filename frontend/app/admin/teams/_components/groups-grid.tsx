"use client";

import { TeamGroup } from "@/data/get-team-groups";
import GroupCard from "./group-card";

interface GroupsGridProps {
  groups: TeamGroup[];
  onPreview: (groupId: string) => void;
}

export default function GroupsGrid({ groups, onPreview }: GroupsGridProps) {
  if (groups.length === 0) {
    return (
      <div className="rounded-md border p-12 text-center">
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="rounded-full bg-muted p-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <p className="text-muted-foreground font-medium">No groups found</p>
          <p className="text-sm text-muted-foreground">
            Create your first team group to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {groups.map((group) => (
        <GroupCard key={group.id} group={group} onPreview={onPreview} />
      ))}
    </div>
  );
}

