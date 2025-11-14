"use client";

import { useState, useEffect, useTransition } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, SparkleIcon } from "lucide-react";
import { toast } from "sonner";
import { 
  assignGptsToGroup
} from "../action";
import type { AdminGpt } from "@/data/get-admin-gpts";
import type { GroupDetails } from "@/data/get-group-details";

interface AssignGptToGroupDialogProps {
  groupId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adminGpts: AdminGpt[];
  group: GroupDetails | null;
  onSuccess?: () => void | Promise<void>;
}

export default function AssignGptToGroupDialog({ 
  groupId, 
  open, 
  onOpenChange,
  adminGpts,
  group,
  onSuccess
}: AssignGptToGroupDialogProps) {
  const [selectedGptIds, setSelectedGptIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Initialize selected GPTs from group assignments
  useEffect(() => {
    if (open && group?.gptAssignments) {
      const assignedIds = group.gptAssignments.map((ga) => ga.gpt.id);
      setSelectedGptIds(assignedIds);
    } else if (open && !group?.gptAssignments) {
      setSelectedGptIds([]);
    }
  }, [open, group]);

  const handleGptToggle = (gptId: string) => {
    setSelectedGptIds(prev => 
      prev.includes(gptId) 
        ? prev.filter(id => id !== gptId)
        : [...prev, gptId]
    );
  };

  const onSubmit = async () => {
    if (!groupId) return;

    startTransition(async () => {
      try {
        const result = await assignGptsToGroup({
          groupId,
          gptIds: selectedGptIds
        });
        
        if (result.success) {
          toast.success("GPTs assigned to group successfully");
          onOpenChange(false);
          router.refresh();
          if (onSuccess) {
            await onSuccess();
          }
        } else {
          toast.error(result.error || "Failed to assign GPTs");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to assign GPTs");
      }
    });
  };

  const getModelBadgeVariant = (model: string) => {
    if (model.includes("gpt")) return "default";
    if (model.includes("claude")) return "secondary";
    if (model.includes("gemini")) return "outline";
    return "outline";
  };

  if (!groupId) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparkleIcon className="h-5 w-5 text-primary" />
            Assign GPTs to Group
          </DialogTitle>
          <DialogDescription>
            Select which GPTs to assign to this group. All group members will have access to the selected GPTs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Available GPTs</h3>
          
          {adminGpts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <SparkleIcon className="h-8 w-8 mx-auto mb-2" />
              <p>No admin GPTs available for assignment</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {adminGpts.map((gpt) => (
                <div
                  key={gpt.id}
                  className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={gpt.id}
                    checked={selectedGptIds.includes(gpt.id)}
                    onCheckedChange={() => handleGptToggle(gpt.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={gpt.image} alt={gpt.name} />
                        <AvatarFallback className="text-xs">
                          {gpt.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <label
                          htmlFor={gpt.id}
                          className="font-medium text-sm cursor-pointer"
                        >
                          {gpt.name}
                        </label>
                        <Badge 
                          variant={getModelBadgeVariant(gpt.model)} 
                          className="ml-2 text-xs"
                        >
                          {gpt.model}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {gpt.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created by {gpt.user.name} • {new Date(gpt.createdAt).toLocaleDateString()}
                    </p>
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
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <SparkleIcon className="h-4 w-4 mr-2" />
                Assign GPTs ({selectedGptIds.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

