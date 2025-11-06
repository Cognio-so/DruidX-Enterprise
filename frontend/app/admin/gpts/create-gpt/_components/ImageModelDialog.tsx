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

const IMAGE_MODELS = [
  {
    id: "bytedance/seedream-4",
    name: "Seedream 4",
    description: "Unified text-to-image generation and precise single-sentence editing at up to 4K resolution",
  },
  {
    id: "google/imagen-4-fast",
    name: "Google Imagen 4 Fast",
    description: "Google's fastest and cheapest image generation model",
  },
  {
    id: "qwen/qwen-image",
    name: "Qwen Image",
    description: "An image generation foundation model in the Qwen series that achieves significant advances in complex text rendering.",
  },
  {
    id: "google/nano-banana",
    name: "Google Nano Banana",
    description: "Google's latest image editing model in Gemini 2.5",
  },
  {
    id: "recraft-ai/recraft-v3",
    name: "Recraft V3",
    description: "Recraft V3 (code-named red_panda) is a text-to-image model with the ability to generate long texts, and images in a wide list of styles.",
  },
  {
    id: "black-forest-labs/flux-1.1-pro",
    name: "Flux 1.1 Pro",
    description: "Text-to-image model with excellent image quality, prompt adherence, and output diversity.",
  },
  {
    id: "black-forest-labs/flux-schnell",
    name: "Flux Schnell",
    description: "The fastest image generation model tailored for local development and personal use",
  },
  {
    id: "google/imagen-4-ultra",
    name: "Google Imagen 4 Ultra",
    description: "Use this ultra version of Imagen 4 when quality matters more than speed and cost",
  },
  {
    id: "recraft-ai/recraft-v3-svg",
    name: "Recraft V3-svg",
    description: "Code-named red_panda, this model has the ability to generate high quality SVG images including logotypes, and icons.",
  },
];

interface ImageModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModel?: string;
  onSelect: (modelId: string) => void;
}

export function ImageModelDialog({
  open,
  onOpenChange,
  selectedModel,
  onSelect,
}: ImageModelDialogProps) {
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
          <DialogTitle>Select Image Generation Model</DialogTitle>
          <DialogDescription>
            Choose a model for image generation. The model will be used when image generation is enabled.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <RadioGroup
            value={tempSelected}
            onValueChange={setTempSelected}
            className="space-y-3"
          >
            {IMAGE_MODELS.map((model) => {
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

