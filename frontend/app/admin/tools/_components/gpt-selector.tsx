"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot } from "lucide-react";

interface Gpt {
  id: string;
  name: string;
  description: string | null;
}

interface GptSelectorProps {
  gpts: Gpt[];
  currentGptId?: string | null;
}

export function GptSelector({ gpts, currentGptId }: GptSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleGptChange = (gptId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (gptId && gptId !== "none") {
      params.set("gptId", gptId);
    } else {
      params.delete("gptId");
    }
    router.push(`/admin/tools?${params.toString()}`);
  };

  return (
    <Select value={currentGptId || "none"} onValueChange={handleGptChange}>
      <SelectTrigger id="gpt-select" className="w-full h-9 text-sm">
        <SelectValue placeholder="Select GPT..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">None (Browse Only)</SelectItem>
        {gpts.map((gpt) => (
          <SelectItem key={gpt.id} value={gpt.id}>
            <div className="flex flex-col">
              <span className="font-medium">{gpt.name}</span>
              {gpt.description && (
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {gpt.description}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

