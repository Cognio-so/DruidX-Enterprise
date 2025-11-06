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
      <DialogContent className="max-w-2xl max-h-[80vh]">
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
            className="space-y-4"
          >
            {VIDEO_MODELS.map((model) => (
              <div
                key={model.id}
                className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-accent transition-colors"
              >
                <RadioGroupItem value={model.id} id={model.id} className="mt-1" />
                <Label
                  htmlFor={model.id}
                  className="flex-1 cursor-pointer space-y-1"
                >
                  <div className="font-semibold">{model.name}</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {model.id}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {model.description}
                  </div>
                </Label>
              </div>
            ))}
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

