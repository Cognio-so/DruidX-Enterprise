"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useState } from "react";
import { AudioLines, Loader2, Sparkle, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { ImageUploader } from "./ImageUploader";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import DocsUploader from "./DocsUploader";
import { PreviewGpt } from "./preview-gpt";
import { ImageModelDialog } from "./ImageModelDialog";
import { VideoModelDialog } from "./VideoModelDialog";
import {
  VoiceConfigDialog,
  STT_PROVIDER_LABELS,
  TTS_PROVIDER_LABELS,
  type VoiceAgentConfig,
} from "@/components/voice/voice-config-dialog";
import { GptFormValues, gptSchema } from "@/lib/zodSchema";
import { createGpt } from "../action";
import { KnowledgeBase } from "@/data/get-knowledge-base";
import { getModelIcon } from "@/components/brand-icons";
import { usePromptEnhancer } from "@/hooks/usePromptEnhancer";

interface CreateGptFormProps {
  knowledgeBases?: KnowledgeBase[];
}

const GptModels = [
  { id: "gemini_2_5_flash", name: "Gemini 2.5 Flash" },
  { id: "gemini_2_5_pro", name: "Gemini 2.5 Pro" },
  { id: "gemini_2_5_flash_lite", name: "Gemini 2.5 Flash-lite" },
  { id: "gpt_4_1", name: "GPT 4.1" },
  { id: "gpt_5", name: "GPT 5" },
  { id: "gpt_5_thinking_high", name: "GPT 5 Thinking High" },
  { id: "gpt_5_mini", name: "GPT 5 mini" },
  { id: "gpt_5_nano", name: "GPT 5 nano" },
  { id: "gpt_4o", name: "GPT-4o" },
  { id: "claude_sonnet_4_5", name: "Claude Sonnet 4.5" },
  { id: "claude_opus_4_1", name: "Claude Opus 4.1" },
  { id: "claude_haiku_3_5", name: "Claude Haiku 3.5" },
  { id: "grok_4_fast", name: "Grok 4 Fast" },
  { id: "deepseek_v3_1", name: "DeepSeek V3.1" },
  { id: "meta_llama_3_3_70b", name: "meta/llama 3.3 70b" },
  { id: "kimi_k2_0905", name: "Kimi K2 0905" },
];

export function CreateGptForm({ knowledgeBases = [] }: CreateGptFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const { enhanceInstructions, isEnhancing, cancelEnhancement } = usePromptEnhancer();

  const form = useForm<GptFormValues>({
    resolver: zodResolver(gptSchema),
    defaultValues: {
      gptName: "",
      gptDescription: "",
      model: "gpt_4o",
      instructions: "",
      webSearch: false,
      hybridRag: false,
      docs: [],
      imageUrl: "",
      image: false,
      video: false,
      imageModel: undefined,
      videoModel: undefined,
      voiceAgentEnabled: false,
      voiceAgentName: "",
      voiceConfidenceThreshold: 0.4,
      voiceSttProvider: undefined,
      voiceSttModelId: undefined,
      voiceSttModelName: undefined,
      voiceTtsProvider: undefined,
      voiceTtsModelId: undefined,
      voiceTtsModelName: undefined,
      minSilenceDuration: 0.5,
      minSpeechDuration: 0.05,
      maxBufferedSpeech: 60.0,
    },
  });

  // Watch all form values for preview
  const formData = form.watch();
  const voiceAgentEnabled = form.watch("voiceAgentEnabled");
  const voiceAgentName = form.watch("voiceAgentName");
  const voiceSttProvider = form.watch("voiceSttProvider");
  const voiceSttModelId = form.watch("voiceSttModelId");
  const voiceSttModelName = form.watch("voiceSttModelName");
  const voiceTtsProvider = form.watch("voiceTtsProvider");
  const voiceTtsModelId = form.watch("voiceTtsModelId");
  const voiceTtsModelName = form.watch("voiceTtsModelName");
  const voiceConfidenceThreshold = form.watch("voiceConfidenceThreshold");

  const handleVoiceSave = (config: VoiceAgentConfig) => {
    form.setValue("voiceAgentEnabled", true);
    form.setValue("voiceAgentName", config.voiceAgentName);
    form.setValue("voiceConfidenceThreshold", config.voiceConfidenceThreshold);
    form.setValue("voiceSttProvider", config.voiceSttProvider ?? undefined);
    form.setValue("voiceSttModelId", config.voiceSttModelId ?? undefined);
    form.setValue("voiceSttModelName", config.voiceSttModelName ?? undefined);
    form.setValue("voiceTtsProvider", config.voiceTtsProvider ?? undefined);
    form.setValue("voiceTtsModelId", config.voiceTtsModelId ?? undefined);
    form.setValue("voiceTtsModelName", config.voiceTtsModelName ?? undefined);
    form.setValue("minSilenceDuration", config.minSilenceDuration);
    form.setValue("minSpeechDuration", config.minSpeechDuration);
    form.setValue("maxBufferedSpeech", config.maxBufferedSpeech);
  };

  const handleVoiceReset = () => {
    form.setValue("voiceAgentEnabled", false);
    form.setValue("voiceAgentName", "");
    form.setValue("voiceConfidenceThreshold", 0.4);
    form.setValue("voiceSttProvider", undefined);
    form.setValue("voiceSttModelId", undefined);
    form.setValue("voiceSttModelName", undefined);
    form.setValue("voiceTtsProvider", undefined);
    form.setValue("voiceTtsModelId", undefined);
    form.setValue("voiceTtsModelName", undefined);
    form.setValue("minSilenceDuration", 0.5);
    form.setValue("minSpeechDuration", 0.05);
    form.setValue("maxBufferedSpeech", 60.0);
  };

  const handleEnhanceInstructions = async () => {
    try {
      const currentInstructions = form.getValues("instructions");
      await enhanceInstructions({
        instructions: currentInstructions,
        gptName: form.getValues("gptName"),
        gptDescription: form.getValues("gptDescription"),
        onChunk: (value) => {
          form.setValue("instructions", value, {
            shouldDirty: true,
            shouldTouch: true,
          });
        },
      });
      toast.success("Instructions enhanced successfully.");
    } catch (error: any) {
      if (error?.name === "AbortError") {
        toast("Prompt enhancement cancelled.");
        return;
      }
      console.error("Prompt enhancement error:", error);
      toast.error(error?.message || "Failed to enhance instructions.");
    }
  };

  const onSubmit = async (data: GptFormValues) => {
    startTransition(async () => {
      try {
        const result = await createGpt(data);
        
        if (result.success) {
          toast.success(result.message || "GPT created successfully!");
          form.reset(); 
          router.push('/admin/gpts');
        } else {
          toast.error(result.error || "Failed to Create Agent");
        }
      } catch (error) {
        console.error("Form submission error:", error);
        toast.error("An unexpected error occurred. Please try again.");
      }
    });
  };

  return (
    <Card className="p-4 w-full mx-auto">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Tabs defaultValue="Details">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="Details">Details</TabsTrigger>
              <TabsTrigger value="Preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="Details">
              <div className="space-y-6">
                {/* GPT Avatar */}
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPT Avatar</FormLabel>
                      <FormControl>
                        <ImageUploader
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GPT Name */}
                <FormField
                  control={form.control}
                  name="gptName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPT Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter GPT name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* GPT Description */}
                <FormField
                  control={form.control}
                  name="gptDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter GPT description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Model Selection */}
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="m-0">Select Model</FormLabel>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex-1">
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <div className="flex items-center gap-2">
                                  {field.value && getModelIcon(field.value, "flex-shrink-0")}
                                  <SelectValue placeholder="Choose a model">
                                    {field.value 
                                      ? GptModels.find(m => m.id === field.value)?.name || field.value
                                      : "Choose a model"}
                                  </SelectValue>
                                </div>
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="max-h-[400px] overflow-y-auto">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 p-2">
                                {GptModels.map((model) => (
                                  <SelectItem key={model.id} value={model.id} className="text-sm">
                                    <div className="flex items-center gap-2">
                                      {getModelIcon(model.id, "flex-shrink-0")}
                                      <span>{model.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </div>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="button"
                          aria-label="Configure voice agent"
                          onClick={() => setVoiceDialogOpen(true)}
                          className="bg-[conic-gradient(at_top,_#22d3ee,_#a855f7,_#f97316,_#22d3ee)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 sm:w-auto"
                        >
                          <span className="flex items-center gap-2">
                            <AudioLines className="size-4" />
                            Voice-Agent
                          </span>
                        </Button>
                      </div>
                      {voiceAgentEnabled ? (
                        <div className="mt-3 space-y-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {voiceAgentName || "Voice Agent"}
                            </span>
                            {voiceSttProvider && voiceSttModelName && (
                              <span>
                                · STT{" "}
                                {STT_PROVIDER_LABELS[
                                  voiceSttProvider as keyof typeof STT_PROVIDER_LABELS
                                ] || "—"}{" "}
                                ({voiceSttModelName})
                              </span>
                            )}
                            {voiceTtsProvider && voiceTtsModelName && (
                              <span>
                                · TTS{" "}
                                {TTS_PROVIDER_LABELS[
                                  voiceTtsProvider as keyof typeof TTS_PROVIDER_LABELS
                                ] || "—"}{" "}
                                ({voiceTtsModelName})
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span>
                              Confidence:{" "}
                              {(voiceConfidenceThreshold ?? 0.4).toFixed(2)}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleVoiceReset}
                            >
                              Clear voice agent
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Configure the voice agent to pair STT and TTS providers
                          for live calls.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Instructions */}
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-3">
                        <FormLabel className="mb-0">Instructions</FormLabel>
                        <div className="flex items-center gap-2">
                          {isEnhancing && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={cancelEnhancement}
                            >
                              Cancel
                            </Button>
                          )}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isEnhancing || isPending}
                            onClick={handleEnhanceInstructions}
                            className="bg-[conic-gradient(at_top,_#6ee7b7,_#3b82f6,_#9333ea,_#6ee7b7)] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/50 sm:w-auto"
                          >
                            {isEnhancing ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 size-4" />
                            )}
                            {isEnhancing ? "Enhancing..." : "Enhance Prompt"}
                          </Button>
                        </div>
                      </div>
                      <FormControl>
                        <RichTextEditor
                          field={{
                            value: field.value,
                            onChange: field.onChange,
                          }}
                        />
                      </FormControl>
                      {isEnhancing && (
                        <p className="text-xs text-muted-foreground">
                          Enhancing instructions with GPT-4o mini...
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Web Search Toggle */}
                <FormField
                  control={form.control}
                  name="webSearch"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Web Search</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow the GPT to search the web for real-time information
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Hybrid RAG Toggle */}
                <FormField
                  control={form.control}
                  name="hybridRag"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable Hybrid RAG</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Enable retrieval-augmented generation with document context
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Image Generation Toggle */}
                <FormField
                  control={form.control}
                  name="image"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5 flex-1">
                        <FormLabel className="text-base">Enable Image Generation</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow the GPT to generate images using AI models
                        </div>
                        {field.value && form.watch("imageModel") && (
                          <div className="text-sm font-medium text-primary mt-1">
                            Selected: {form.watch("imageModel")}
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              setImageDialogOpen(true);
                            } else {
                              form.setValue("imageModel", undefined);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* Video Generation Toggle */}
                <FormField
                  control={form.control}
                  name="video"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5 flex-1">
                        <FormLabel className="text-base">Enable Video Generation</FormLabel>
                        <div className="text-sm text-muted-foreground">
                          Allow the GPT to generate videos using AI models
                        </div>
                        {field.value && form.watch("videoModel") && (
                          <div className="text-sm font-medium text-primary mt-1">
                            Selected: {form.watch("videoModel")}
                          </div>
                        )}
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              setVideoDialogOpen(true);
                            } else {
                              form.setValue("videoModel", undefined);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Separator />

                {/* Document Upload */}
                <FormField
                  control={form.control}
                  name="docs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upload Documents</FormLabel>
                      <FormControl>
                        <DocsUploader
                          value={field.value}
                          onChange={field.onChange}
                          knowledgeBases={knowledgeBases}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkle className="size-4" />
                  )}
                  {isPending ? "Creating Agent..." : "Create Agent"}
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="Preview">
              <PreviewGpt data={formData} />
            </TabsContent>
          </Tabs>

          {/* Image Model Dialog */}
          <ImageModelDialog
            open={imageDialogOpen}
            onOpenChange={setImageDialogOpen}
            selectedModel={form.watch("imageModel")}
            onSelect={(modelId) => {
              form.setValue("imageModel", modelId);
            }}
          />

          {/* Video Model Dialog */}
          <VideoModelDialog
            open={videoDialogOpen}
            onOpenChange={setVideoDialogOpen}
            selectedModel={form.watch("videoModel")}
            onSelect={(modelId) => {
              form.setValue("videoModel", modelId);
            }}
          />

          <VoiceConfigDialog
            open={voiceDialogOpen}
            onOpenChange={setVoiceDialogOpen}
            value={{
              voiceAgentEnabled: Boolean(voiceAgentEnabled),
              voiceAgentName: voiceAgentName || "",
              voiceConfidenceThreshold: voiceConfidenceThreshold ?? 0.4,
              voiceSttProvider: (voiceSttProvider ?? null) as VoiceAgentConfig["voiceSttProvider"],
              voiceSttModelId: voiceSttModelId ?? null,
              voiceSttModelName: voiceSttModelName ?? null,
              voiceTtsProvider: (voiceTtsProvider ?? null) as VoiceAgentConfig["voiceTtsProvider"],
              voiceTtsModelId: voiceTtsModelId ?? null,
              voiceTtsModelName: voiceTtsModelName ?? null,
              minSilenceDuration: form.watch("minSilenceDuration") ?? 0.5,
              minSpeechDuration: form.watch("minSpeechDuration") ?? 0.05,
              maxBufferedSpeech: form.watch("maxBufferedSpeech") ?? 60.0,
            }}
            onSave={handleVoiceSave}
          />
        </form>
      </Form>
    </Card>
  );
}



