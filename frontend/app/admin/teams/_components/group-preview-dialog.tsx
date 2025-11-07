"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Users, Sparkles, UserPlus, Trash2, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  removeMemberFromGroup,
  removeGptFromGroup,
  deleteTeamGroup,
  getGroupDetailsForClient
} from "../action";
import type { GroupDetails } from "@/data/get-group-details";
import type { TeamMember } from "@/data/get-team-members";
import type { AdminGpt } from "@/data/get-admin-gpts";
import AssignGptToGroupDialog from "./assign-gpt-to-group-dialog";
import { addMembersToGroup } from "../action";

interface GroupPreviewDialogProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamMembers: TeamMember[];
  adminGpts: AdminGpt[];
}

export default function GroupPreviewDialog({ 
  groupId, 
  open, 
  onOpenChange,
  teamMembers,
  adminGpts
}: GroupPreviewDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [showAssignGpt, setShowAssignGpt] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const router = useRouter();

  const [group, setGroup] = useState<GroupDetails | null>(null);
  const [hasAttemptedLoad, setHasAttemptedLoad] = useState(false);
  const loadingRef = useRef(false);

  // Fetch group data when dialog opens - track loading state to avoid showing "not found" prematurely
  useEffect(() => {
    if (open && groupId && !loadingRef.current) {
      loadingRef.current = true;
      setHasAttemptedLoad(false);
      getGroupDetailsForClient(groupId)
        .then((data) => {
          setGroup(data);
          setHasAttemptedLoad(true);
          loadingRef.current = false;
        })
        .catch((error) => {
          toast.error("Failed to load group data");
          setGroup(null);
          setHasAttemptedLoad(true);
          loadingRef.current = false;
        });
    } else if (!open) {
      setGroup(null);
      setHasAttemptedLoad(false);
      loadingRef.current = false;
    }
  }, [open, groupId]);

  const existingMemberIds = group?.members.map((m: { user: { id: string } }) => m.user.id) || [];
  const availableMembers = teamMembers.filter((m: TeamMember) => !existingMemberIds.includes(m.id));

  // Initialize selected member IDs when dialog opens
  if (open && availableMembers.length > 0 && selectedMemberIds.length === 0) {
    setSelectedMemberIds([availableMembers[0].id]);
  }

  const handleRemoveMember = async (userId: string) => {
    if (!groupId) return;

    startTransition(async () => {
      try {
        const result = await removeMemberFromGroup(groupId, userId);
        
        if (result.success) {
          toast.success("Member removed from group");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to remove member");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove member");
      }
    });
  };

  const handleRemoveGpt = async (gptId: string) => {
    if (!groupId) return;

    startTransition(async () => {
      try {
        const result = await removeGptFromGroup(groupId, gptId);
        
        if (result.success) {
          toast.success("GPT removed from group");
          router.refresh();
        } else {
          toast.error(result.error || "Failed to remove GPT");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to remove GPT");
      }
    });
  };

  const handleDeleteGroup = async () => {
    if (!groupId) return;

    if (!confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await deleteTeamGroup(groupId);
        
        if (result.success) {
          toast.success("Group deleted successfully");
          onOpenChange(false);
          router.refresh();
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete group");
      }
    });
  };

  const handleAddMembers = async () => {
    if (!groupId || selectedMemberIds.length === 0) return;

    startTransition(async () => {
      try {
        const result = await addMembersToGroup({
          groupId,
          userIds: selectedMemberIds
        });
        
        if (result.success) {
          toast.success("Members added to group");
          setShowAddMembers(false);
          setSelectedMemberIds([]);
          router.refresh();
        } else {
          toast.error(result.error || "Failed to add members");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to add members");
      }
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!groupId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {group?.name || "Group Preview"}
            </DialogTitle>
            <DialogDescription>
              Manage group members and assigned GPTs
            </DialogDescription>
          </DialogHeader>

          {!hasAttemptedLoad ? (
            <div className="space-y-6">
              {/* Description skeleton */}
              <Skeleton className="h-16 w-full rounded-lg" />
              
              {/* Members section skeleton */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-16" /></TableHead>
                        <TableHead className="w-[70px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <Skeleton className="h-10 w-10 rounded-full" />
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-48" />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-6 w-16" />
                          </TableCell>
                          <TableCell>
                            <Skeleton className="h-9 w-9" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* GPTs section skeleton */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-9 w-28" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                      <Skeleton className="h-9 w-9" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : !group ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>Group not found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {group.description && (
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">{group.description}</p>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Members ({group.members.length})
                  </h3>
                  {availableMembers.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddMembers(true)}
                      className="gap-2"
                    >
                      <UserPlus className="h-4 w-4" />
                      Add Members
                    </Button>
                  )}
                </div>

                {group.members.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No members in this group</p>
                  </div>
                ) : (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Member</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead className="w-[70px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.members.map((member) => (
                          <TableRow key={member.user.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage
                                    src={member.user.image || undefined}
                                    alt={member.user.name}
                                  />
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(member.user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{member.user.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {member.user.email}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={member.user.role === "admin" ? "default" : "secondary"}>
                                {member.user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveMember(member.user.id)}
                                disabled={isPending}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Assigned GPTs ({group.gptAssignments.length})
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAssignGpt(true)}
                    className="gap-2"
                  >
                    <Sparkles className="h-4 w-4" />
                    Assign GPTs
                  </Button>
                </div>

                {group.gptAssignments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No GPTs assigned to this group</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {group.gptAssignments.map((assignment) => (
                      <div
                        key={assignment.gpt.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage 
                              src={assignment.gpt.image || undefined} 
                              alt={assignment.gpt.name} 
                            />
                            <AvatarFallback>
                              {assignment.gpt.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{assignment.gpt.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {assignment.gpt.description}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveGpt(assignment.gpt.id)}
                          disabled={isPending}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Group
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssignGptToGroupDialog
        groupId={groupId}
        open={showAssignGpt}
        onOpenChange={setShowAssignGpt}
        adminGpts={adminGpts}
        group={group}
      />

      {showAddMembers && (
        <Dialog open={showAddMembers} onOpenChange={setShowAddMembers}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Members to Group</DialogTitle>
              <DialogDescription>
                Select members to add to this group. They will automatically get access to all assigned GPTs.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {availableMembers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  All available members are already in this group
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMemberIds.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMemberIds([...selectedMemberIds, member.id]);
                          } else {
                            setSelectedMemberIds(selectedMemberIds.filter(id => id !== member.id));
                          }
                        }}
                        className="rounded"
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.image || undefined} alt={member.name} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddMembers(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddMembers}
                disabled={isPending || selectedMemberIds.length === 0}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Members ({selectedMemberIds.length})
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

