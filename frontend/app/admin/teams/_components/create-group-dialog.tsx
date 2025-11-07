"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { teamGroupSchema, TeamGroupValues } from "@/lib/zodSchema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createTeamGroup } from "@/app/admin/teams/action";
import { ImageUploader } from "@/app/admin/gpts/create-gpt/_components/ImageUploader";

interface CreateGroupDialogProps {
  onGroupCreated?: () => void;
}

export default function CreateGroupDialog({ onGroupCreated }: CreateGroupDialogProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TeamGroupValues>({
    resolver: zodResolver(teamGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      image: undefined,
    },
  });

  const onSubmit = async (data: TeamGroupValues) => {
    startTransition(async () => {
      try {
        const result = await createTeamGroup(data);
        
        if (result.success) {
          toast.success(`Group "${data.name}" created successfully`);
          setOpen(false);
          reset();
          onGroupCreated?.();
        } else {
          toast.error(result.error || "Failed to create group");
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create group");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" variant="default">
          <Users className="h-4 w-4 " />
          Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Create Team Group
          </DialogTitle>
          <DialogDescription>
            Create a new team group to organize members and assign GPTs collectively.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Group Name *</Label>
              <Input
                id="name"
                type="text"
                placeholder="Engineering Team"
                {...register("name")}
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="A brief description of this group..."
                {...register("description")}
                className={errors.description ? "border-destructive" : ""}
                rows={3}
              />
              {errors.description && (
                <p className="text-sm text-destructive">{errors.description.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="image">Group Image (Optional)</Label>
              <ImageUploader
                value={watch("image")}
                onChange={(url) => setValue("image", url || undefined)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isPending}
              className="gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  Create Group
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

