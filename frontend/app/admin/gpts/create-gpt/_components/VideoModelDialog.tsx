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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

const VIDEO_MODELS = [
  {
    id: "google/veo-3.1",
    name: "Veo 3.1 (Google)",
    description: "New and improved version of Veo 3, with higher-fidelity video, context-aware audio, reference image and last frame support",
  },
  {
    id: "openai/sora-2",
    name: "Sora 2 (OpenAI)",
    description: "OpenAI's Flagship video generation with synced audio",
  },
  {
    id: "minimax/hailuo-2.3",
    name: "Hailuo 2.3 (Minimax)",
    description: "High‑fidelity video generation: realistic motion, cinematic VFX, expressive characters, strong adherence.",
  },
  {
    id: "bytedance/seedance-1-pro-fast",
    name: "Seedance 1 Pro fast (ByteDance)",
    description: "A faster and cheaper version of Seedance 1 Pro",
  },
  {
    id: "google/veo-3.1-fast",
    name: "Veo 3.1 fast (Google)",
    description: "New and improved version of Veo 3 Fast, with higher-fidelity video, context-aware audio and last frame support",
  },
  {
    id: "fofr/not-real",
    name: "Not-real (fofr)",
    description: "Make a very realistic looking real-world AI video",
  },
  {
    id: "wan-video/wan-2.5-i2v",
    name: "Wan Video (w/ Audio)",
    description: "Alibaba Wan 2.5 Image to video generation with background audio",
  },
  {
    id: "kwaivgi/kling-v2.0",
    name: "Kling 2.0",
    description: "Generate 5s and 10s videos in 720p resolution",
  },
];

interface VideoModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel?: string;
  onSelect: (modelId: string) => void;
}

export function VideoModelDialog({
  open,
  onOpenChange,
  selectedModel,
  onSelect,
}: VideoModelDialogProps) {
  const [tempSelected, setTempSelected] = useState(selectedModel || "");

  useEffect(() => {
    if (open) {
      setTempSelected(selectedModel || "");
    }
  }, [open, selectedModel]);

  const handleSelect = () => {
    if (tempSelected) {
      onSelect(tempSelected);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Select Video Generation Model</DialogTitle>
          <DialogDescription>
            Choose a model for video generation. The model will be used when video generation is enabled.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <RadioGroup
            value={tempSelected}
            onValueChange={setTempSelected}
            className="space-y-3"
          >
            {VIDEO_MODELS.map((model) => {
              const isSelected = tempSelected === model.id;
              return (
                <div
                  key={model.id}
                  className={`relative flex items-start gap-3 rounded-lg border-2 p-4 transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-primary/50 hover:bg-accent/50"
                  }`}
                  onClick={() => setTempSelected(model.id)}
                >
                  <RadioGroupItem
                    value={model.id}
                    id={model.id}
                    className="mt-0.5 flex-shrink-0"
                  />
                  <Label
                    htmlFor={model.id}
                    className="flex-1 cursor-pointer space-y-1.5 min-w-0"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-semibold text-base leading-tight">
                        {model.name}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono leading-tight">
                        ({model.id})
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {model.description}
                    </p>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!tempSelected}>
            Select Model
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

