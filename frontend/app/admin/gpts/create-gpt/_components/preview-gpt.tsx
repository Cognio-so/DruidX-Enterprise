"use client";

import { Button } from "@/components/ui/button";
import { Globe2, PlusIcon, Image as ImageIcon, Video, Waves, Share2 } from "lucide-react";
import { GptFormValues } from "@/lib/zodSchema";
import Image from "next/image";
import { cn } from "@/lib/utils";

type PreviewGptProps = {
  data: GptFormValues;
};

export function PreviewGpt({ data }: PreviewGptProps) {
  const {
    gptName,
    gptDescription,
    model,
    webSearch,
    hybridRag,
    image,
    video,
    imageModel,
    videoModel,
    voiceAgentEnabled,
    voiceAgentName,
    voiceConfidenceThreshold,
    voiceSttProvider,
    voiceSttModelName,
    voiceTtsProvider,
    voiceTtsModelName,
    minSilenceDuration,
    minSpeechDuration,
    maxBufferedSpeech,
    docs,
    imageUrl,
  } = data;

  const featureBadges = [
    {
      label: "Web Search",
      active: webSearch,
      icon: <Globe2 className="size-3.5" />,
    },
    {
      label: "Hybrid RAG",
      active: hybridRag,
      icon: <Share2 className="size-3.5" />,
    },
    {
      label: "Image Gen",
      active: !!image,
      icon: <ImageIcon className="size-3.5" />,
      extra: imageModel,
    },
    {
      label: "Video Gen",
      active: !!video,
      icon: <Video className="size-3.5" />,
      extra: videoModel,
    },
    {
      label: "Voice Agent",
      active: !!voiceAgentEnabled,
      icon: <Waves className="size-3.5" />,
      extra: voiceAgentName,
    },
  ];

  return (
    <div className="min-h-[600px] bg-card rounded-xl border border-border p-8 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-foreground">Preview</h2>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center flex-1 py-12">
        {/* GPT Avatar */}
        <div className="mb-6">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={gptName || "GPT Avatar"}
              width={96}
              height={96}
              className="w-24 h-24 rounded-full object-cover border-4 border-border/40"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-muted border-4 border-border/50 flex items-center justify-center">
              <div className="w-12 h-12 bg-muted-foreground/10 rounded-full flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
            </div>
          )}
        </div>

        {/* GPT Name */}
        <h1 className="text-3xl font-bold mb-4 text-center">
          {gptName || "My Custom GPT"}
        </h1>

        {/* GPT Description */}
        <p className="text-lg text-muted-foreground text-center max-w-md mb-8">
          {gptDescription || "A helpful assistant that can answer questions about various topics."}
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {featureBadges.map((feature) => (
            <div
              key={feature.label}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition",
                feature.active
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-muted text-muted-foreground border-transparent"
              )}
            >
              {feature.icon}
              <span className="text-foreground">{feature.label}</span>
              {feature.active && feature.extra && (
                <span className="text-muted-foreground text-[11px]">· {feature.extra}</span>
              )}
            </div>
          ))}
        </div>

        {/* Configuration Details */}
        <div className="bg-muted/40 rounded-lg border border-border/50 p-4 mb-8 w-full max-w-2xl">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Model:</span>
              <span className="text-foreground font-medium">{model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Web Search:</span>
              <span className={cn("font-medium", webSearch ? "text-primary" : "text-muted-foreground")}>
                {webSearch ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hybrid RAG:</span>
              <span className={cn("font-medium", hybridRag ? "text-primary" : "text-muted-foreground")}>
                {hybridRag ? "Enabled" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Knowledge Base Docs:</span>
              <span className="text-foreground font-medium">{docs.length} file(s)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Image Gen Model:</span>
              <span className="text-foreground font-medium">
                {image ? imageModel || "Configured" : "Disabled"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Video Gen Model:</span>
              <span className="text-foreground font-medium">
                {video ? videoModel || "Configured" : "Disabled"}
              </span>
            </div>
          </div>

          {voiceAgentEnabled && (
            <div className="mt-6 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Waves className="size-4" />
                    Voice Agent
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {voiceAgentName || "Voice agent configured with live STT/TTS."}
                  </p>
                </div>
                <span className="text-xs font-semibold text-primary">
                  {(voiceConfidenceThreshold ?? 0.4).toFixed(2)} confidence
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
                <div className="rounded-md bg-background p-2 border">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">STT</p>
                  <p className="text-foreground font-medium">
                    {voiceSttProvider || "—"}
                  </p>
                  <p>{voiceSttModelName || "Model TBD"}</p>
                </div>
                <div className="rounded-md bg-background p-2 border">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">TTS</p>
                  <p className="text-foreground font-medium">
                    {voiceTtsProvider || "—"}
                  </p>
                  <p>{voiceTtsModelName || "Model TBD"}</p>
                </div>
                <div className="rounded-md bg-background p-2 border">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">Timing</p>
                  <p className="text-foreground font-medium">
                    {minSilenceDuration?.toFixed(2)}s silence
                  </p>
                  <p>
                    {minSpeechDuration?.toFixed(2)}s speech · {maxBufferedSpeech?.toFixed(0)}s buffer
                  </p>
                </div>
              </div>
            </div>
          )}

          {!voiceAgentEnabled && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 px-4 py-3 text-sm text-muted-foreground">
              <Waves className="size-4" />
              Voice agent is currently disabled. Enable it to configure live calls.
            </div>
          )}
        </div>
      </div>

      {/* Chat Input */}
      <div className="mt-auto">
        <div className="flex items-center gap-3 bg-muted rounded-full p-3 border border-border/60">
          <input
            type="text"
            placeholder="Ask anything"
            className="flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
            disabled
          />
          <Button
            size="icon"
            className="bg-foreground/10 hover:bg-foreground/20 text-foreground border-0"
            disabled
          >
            <PlusIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
