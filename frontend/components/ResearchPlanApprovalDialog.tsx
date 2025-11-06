"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Markdown from "@/components/ui/markdown";

interface ResearchPlanApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: string[];
  onApprove: () => void;
  onCancel: (feedback?: string) => void;
}

export function ResearchPlanApprovalDialog({
  open,
  onOpenChange,
  plan,
  onApprove,
  onCancel,
}: ResearchPlanApprovalDialogProps) {
  const [feedback, setFeedback] = useState("");
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (open) {
      setFeedback("");
      setShowFeedback(false);
    }
  }, [open]);

  const handleApprove = () => {
    onApprove();
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (showFeedback && feedback.trim()) {
      onCancel(feedback.trim());
    } else {
      onCancel();
    }
    onOpenChange(false);
  };

  const handleRejectClick = () => {
    setShowFeedback(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col overflow-hidden p-0 gap-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4">
          <DialogTitle>Research Plan Approval</DialogTitle>
          <DialogDescription>
            Review the generated research plan and approve or provide feedback for
            modifications.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6">
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <Label className="text-sm font-semibold">
              Research Questions ({plan.length})
            </Label>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden">
            <ScrollArea className="h-full border rounded-md">
              <div className="p-4">
                <ol className="space-y-3 list-decimal list-inside">
                  {plan.map((question, index) => (
                    <li
                      key={index}
                      className="text-sm leading-relaxed pl-2"
                    >
                      <Markdown content={question} className="inline" />
                    </li>
                  ))}
                </ol>
              </div>
            </ScrollArea>
          </div>
          {showFeedback && (
            <div className="space-y-2 flex-shrink-0 mt-4 pb-4">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                placeholder="Provide feedback on what should be changed in the research plan..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          )}
        </div>
        <DialogFooter className="flex-shrink-0 px-6 pb-6">
          {!showFeedback ? (
            <>
              <Button variant="outline" onClick={handleRejectClick}>
                Reject
              </Button>
              <Button onClick={handleApprove}>Approve</Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setShowFeedback(false)}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                Cancel Research
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

