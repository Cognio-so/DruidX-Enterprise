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
import { Loader2 } from "lucide-react";

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
  const [feedbackError, setFeedbackError] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFeedback("");
      setShowFeedback(false);
      setFeedbackError("");
      setIsApproving(false);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApprove();
    } finally {
      setIsApproving(false);
      onOpenChange(false);
    }
  };

  const handleRejectWithFeedback = async () => {
    const trimmedFeedback = feedback.trim();
    
    if (!trimmedFeedback) {
      setFeedbackError("Please provide feedback to help improve the research plan.");
      return;
    }
    
    setFeedbackError("");
    setIsSubmitting(true);
    try {
      await onCancel(trimmedFeedback);
    } finally {
      setIsSubmitting(false);
      onOpenChange(false);
    }
  };

  const handleRejectClick = () => {
    setShowFeedback(true);
    setFeedbackError("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[1200px] max-w-[95vw] max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Research Plan Approval</DialogTitle>
          <DialogDescription>
            Review the generated research plan and approve or provide feedback for modifications.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-4">
          <Label className="text-sm font-semibold mb-2 block">
            Research Questions ({plan.length})
          </Label>
          <ScrollArea className="h-[400px] w-full border rounded-md">
            <div className="p-4">
              <ol className="space-y-3 list-decimal list-inside">
                {plan.map((question, index) => (
                  <li key={index} className="text-sm leading-relaxed pl-2">
                    <Markdown content={question} className="inline" />
                  </li>
                ))}
              </ol>
            </div>
          </ScrollArea>
        </div>

        {showFeedback && (
          <div className="px-6 pb-4 space-y-2 border-t pt-4">
            <Label htmlFor="feedback">
              Feedback <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="feedback"
              placeholder="Please provide feedback on what should be changed in the research plan..."
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                if (feedbackError && e.target.value.trim()) {
                  setFeedbackError("");
                }
              }}
              className={`min-h-[100px] ${feedbackError ? "border-destructive" : ""}`}
            />
            {feedbackError && (
              <p className="text-sm text-destructive">{feedbackError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Your feedback will be used to regenerate a better research plan.
            </p>
          </div>
        )}

        <DialogFooter className="px-6 pb-6">
          {!showFeedback ? (
            <>
              <Button variant="outline" onClick={handleRejectClick} disabled={isApproving}>
                Reject
              </Button>
              <Button onClick={handleApprove} disabled={isApproving}>
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : (
                  "Approve"
                )}
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFeedback(false);
                  setFeedbackError("");
                }}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button variant="destructive" onClick={handleRejectWithFeedback} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Reject Plan & Submit Feedback"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
