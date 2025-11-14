"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition, useRef, useState } from "react";
import { Loader2, Sparkle } from "lucide-react";
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

import { ImageUploader } from "../../../create-gpt/_components/ImageUploader";
import { RichTextEditor } from "@/components/rich-text-editor/Editor";
import DocsUploader from "../../../create-gpt/_components/DocsUploader";
import { PreviewGpt } from "../../../create-gpt/_components/preview-gpt";
import { ImageModelDialog } from "../../../create-gpt/_components/ImageModelDialog";
import { VideoModelDialog } from "../../../create-gpt/_components/VideoModelDialog";
import { GptFormValues, gptSchema } from "@/lib/zodSchema";
import { editGpt } from "../action";
import { getModelIcon } from "@/components/brand-icons";

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

interface EditGptFormProps {
  gptId: string;
  initialData: {
    id: string;
    name: string;
    description: string;
    model: string;
    instruction: string;
    webBrowser: boolean;
    hybridRag: boolean;
    image: string;
    imageEnabled?: boolean;
    videoEnabled?: boolean;
    imageModel?: string | null;
    videoModel?: string | null;
    docs: string[];
  };
}

export function EditGptForm({ gptId, initialData }: EditGptFormProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const isSubmittingRef = useRef(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);

  const form = useForm<GptFormValues>({
    resolver: zodResolver(gptSchema),
    defaultValues: {
      gptName: initialData.name,
      gptDescription: initialData.description,
      model: initialData.model as any,
      instructions: initialData.instruction,
      webSearch: initialData.webBrowser,
      hybridRag: initialData.hybridRag,
      docs: initialData.docs,
      imageUrl: initialData.image !== "default-avatar.png" ? initialData.image : "",
      image: Boolean(initialData.imageEnabled ?? false),
      video: Boolean(initialData.videoEnabled ?? false),
      imageModel: initialData.imageModel ?? undefined,
      videoModel: initialData.videoModel ?? undefined,
    },
  });

  // Watch all form values for preview
  const formData = form.watch();

  const onSubmit = async (data: GptFormValues) => {
    // Prevent double submission
    if (isSubmittingRef.current || isPending) {
      return;
    }

    isSubmittingRef.current = true;

    startTransition(async () => {
      try {
        const result = await editGpt({ ...data, id: gptId });
        
        if (result.success) {
          toast.success(result.message || "GPT updated successfully!");
          router.push('/admin/gpts');
        } else {
          toast.error(result.error || "Failed to update GPT");
        }
      } catch (error) {
        console.error("Form submission error:", error);
        toast.error("An unexpected error occurred. Please try again.");
      } finally {
        isSubmittingRef.current = false;
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
                      <FormLabel>Select Model</FormLabel>
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
                      <FormLabel>Instructions</FormLabel>
                      <FormControl>
                        <RichTextEditor
                          field={{
                            value: field.value,
                            onChange: field.onChange,
                          }}
                        />
                      </FormControl>
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
                  {isPending ? "Updating GPT..." : "Update GPT"}
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
        </form>
      </Form>
    </Card>
  );
}