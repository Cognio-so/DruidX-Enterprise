"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowUp, Globe, Paperclip, Sparkle, Telescope, X, Phone, PhoneOff, AudioLines, XCircle, Plus } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";
import { getModelsForFrontend, frontendToBackend, getDisplayName } from "@/lib/modelMapping";
import { ComposioToolSelector } from "@/app/admin/gpts/[id]/chat/_components/ComposioToolSelector";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  VoiceAgentConfig,
  VoiceConfigDialog,
  STT_PROVIDER_LABELS,
  TTS_PROVIDER_LABELS,
} from "@/components/voice/voice-config-dialog";

interface VoiceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface ChatInputProps {
  onSendMessage: (message: string, options: {
    web_search?: boolean;
    rag?: boolean;
    deep_search?: boolean;
    uploaded_doc?: boolean;
    uploaded_docs?: UploadedDoc[];
    model?: string;
    composio_tools?: string[];
    image?: boolean;
    video?: boolean;
    imageModel?: string;
    videoModel?: string;
  }) => void;
  onDocumentUploaded?: (docs: UploadedDoc[]) => Promise<void>;
  hasMessages: boolean;
  isLoading?: boolean;
  hybridRag?: boolean;
  defaultModel?: string;
  gptId?: string;
  sessionId?: string | null;
  onVoiceMessage?: (message: VoiceMessage) => void;
  onVoiceConnectionChange?: (connected: boolean) => void;
  imageEnabled?: boolean;
  videoEnabled?: boolean;
  imageModel?: string;
  videoModel?: string;
  onModelChange?: (model: string) => Promise<void>;
  defaultVoiceConfig?: VoiceAgentConfig;
  onVoiceSettingsChange?: (config: VoiceAgentConfig) => Promise<void> | void;
}

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
}

const mergeUploadedDocs = (
  existing: UploadedDoc[],
  incoming: UploadedDoc[]
): UploadedDoc[] => {
  const map = new Map<string, UploadedDoc>();
  [...existing, ...incoming].forEach((doc) => {
    const key = `${doc.url || ""}|${doc.filename}|${doc.type}`;
    map.set(key, doc);
  });
  return Array.from(map.values());
};

type UploadStage = "uploading" | "processing" | "completed" | "error";

interface UploadingFileState {
  id: string;
  file?: File;
  fileName: string;
  fileType: string;
  progress: number;
  stage: UploadStage;
}

// Get models from mapping
const models = getModelsForFrontend();

export default function ChatInput({
  onSendMessage,
  onDocumentUploaded,
  hasMessages,
  isLoading = false,
  hybridRag = false,
  defaultModel,
  gptId,
  sessionId,
  onVoiceMessage,
  onVoiceConnectionChange,
  imageEnabled = false,
  videoEnabled = false,
  imageModel,
  videoModel,
  onModelChange,
  defaultVoiceConfig,
  onVoiceSettingsChange,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt_4o");
  const [webSearch, setWebSearch] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [composioTools, setComposioTools] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFileState[]>([]);
  const hasActiveUploads = uploadingFiles.some(
    (file) => file.stage === "processing"
  );
  const visibleUploadingFiles = uploadingFiles.filter(
    (file) => file.stage === "processing" || file.stage === "error"
  );
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Voice chat integration
  const { connected, connecting, error, connect, disconnect, audioStream } = useVoiceChat({
    sessionId: sessionId || null,
    gptId,
    onMessage: onVoiceMessage,
  });

  const sanitizeProvider = useCallback(
    <T extends Record<string, string>>(value: string | null | undefined, labels: T) => {
      if (!value) return null;
      return Object.prototype.hasOwnProperty.call(labels, value)
        ? (value as keyof T)
        : null;
    },
    []
  );

  const buildVoiceConfig = useCallback(
    (config?: VoiceAgentConfig): VoiceAgentConfig => ({
      voiceAgentEnabled: config?.voiceAgentEnabled ?? false,
      voiceAgentName: config?.voiceAgentName ?? "",
      voiceConfidenceThreshold: config?.voiceConfidenceThreshold ?? 0.4,
      voiceSttProvider: sanitizeProvider(config?.voiceSttProvider, STT_PROVIDER_LABELS),
      voiceSttModelId: config?.voiceSttModelId ?? null,
      voiceSttModelName: config?.voiceSttModelName ?? null,
      voiceTtsProvider: sanitizeProvider(config?.voiceTtsProvider, TTS_PROVIDER_LABELS),
      voiceTtsModelId: config?.voiceTtsModelId ?? null,
      voiceTtsModelName: config?.voiceTtsModelName ?? null,
    }),
    [sanitizeProvider]
  );

  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceConfig, setVoiceConfig] = useState<VoiceAgentConfig>(() =>
    buildVoiceConfig(defaultVoiceConfig)
  );

  useEffect(() => {
    setVoiceConfig(buildVoiceConfig(defaultVoiceConfig));
  }, [defaultVoiceConfig, buildVoiceConfig]);

  // Notify parent when voice connection changes
  useEffect(() => {
    onVoiceConnectionChange?.(connected);
  }, [connected, onVoiceConnectionChange]);

  // Auto-expand textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, [message]);

  const handleVoiceToggle = async () => {
    if (connected) {
      await disconnect();
    } else {
      setVoiceDialogOpen(true);
    }
  };

  const handleVoiceConfigSave = async (config: VoiceAgentConfig) => {
    setVoiceConfig(config);
    setVoiceDialogOpen(false);

    try {
      await onVoiceSettingsChange?.(config);
    } catch (err) {
      console.error("Failed to sync voice settings:", err);
    }

    try {
      await connect({
        voiceAgentName: config.voiceAgentName,
        voiceConfidenceThreshold: config.voiceConfidenceThreshold,
        voiceSttProvider: config.voiceSttProvider,
        voiceSttModelId: config.voiceSttModelId,
        voiceSttModelName: config.voiceSttModelName,
        voiceTtsProvider: config.voiceTtsProvider,
        voiceTtsModelId: config.voiceTtsModelId,
        voiceTtsModelName: config.voiceTtsModelName,
      });
    } catch (err) {
      console.error("Voice connection failed:", err);
    }
  };

  useEffect(() => {
    if (defaultModel) {
      const modelExists = models.find(model => model.value === defaultModel);
      if (modelExists) {
          setSelectedModel(defaultModel);
      }
    }
  }, [defaultModel]);

  const handleModelChange = async (value: string) => {
    setSelectedModel(value);
    // Update GPT config on backend when model changes
    if (onModelChange) {
      const backendModelName = frontendToBackend(value);
      await onModelChange(backendModelName);
    }
  };

  const handleSend = () => {
    if ((message.trim() || uploadedDocs.length > 0) && !isLoading && !isUploading && !hasActiveUploads) {
      const backendModelName = frontendToBackend(selectedModel);
      
      const sendOptions = {
        web_search: webSearch,
        rag: hybridRag,
        deep_search: deepSearch,
        uploaded_doc: uploadedDocs.length > 0,
        uploaded_docs: uploadedDocs,
        model: backendModelName,
        composio_tools: composioTools,
        image: imageEnabled,
        video: videoEnabled,
        imageModel: imageModel,
        videoModel: videoModel,
      };

      onSendMessage(message.trim() || "Files attached", sendOptions);
      setMessage("");
      setUploadedDocs([]);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const uploadToS3 = async (file: File): Promise<string> => {
    const response = await fetch("/api/s3/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get upload URL");
    }

    const { uploadUrl, fileUrl } = await response.json();

    // Upload to S3 without progress tracking
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Upload failed");
    }

    return fileUrl;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/markdown",
      "application/json",
      "text/plain",
      "text/javascript",
      "application/javascript",
      "text/x-python",
      "text/typescript",
      "text/x-c++src",
      "text/x-csrc",
      "text/x-c",
      "text/html",
      "text/css",
    ];

    // Code file extensions including HTML and CSS
    const codeExtensions = [".py", ".js", ".ts", ".tsx", ".jsx", ".cpp", ".c", ".cc", ".cxx", ".h", ".hpp", ".java", ".rb", ".go", ".rs", ".php", ".swift", ".kt", ".scala", ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd", ".html", ".htm", ".css"];

    // Check if total files exceed 5 (including already uploaded)
    const totalFiles = uploadedDocs.length + files.length;
    if (totalFiles > 5) {
      toast.error(`You can only upload up to 5 documents at once. You currently have ${uploadedDocs.length} document(s) uploaded.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    // Validate all files
    const invalidFiles: string[] = [];
    const validFiles: File[] = [];

    Array.from(files).forEach((file) => {
      const fileName = file.name.toLowerCase();
      const isAllowedByType = allowedTypes.some(type => file.type.startsWith(type));
      const isAllowedByExtension = codeExtensions.some(ext => fileName.endsWith(ext)) ||
        fileName.endsWith(".md") || fileName.endsWith(".markdown") ||
        fileName.endsWith(".pdf") || fileName.endsWith(".doc") || fileName.endsWith(".docx") ||
        fileName.endsWith(".json") || fileName.endsWith(".txt");
      
      if (!isAllowedByType && !isAllowedByExtension) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`The following files are not supported: ${invalidFiles.join(", ")}\n\nPlease upload PDF, Word document, Markdown, JSON, code files (including HTML/CSS), or image files only.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (validFiles.length === 0) return;
    }

    setIsUploading(true);
    const uploadedDocsList: UploadedDoc[] = [];
    const successfulUploadIds = new Set<string>();
    const errors: string[] = [];
    const shouldAwaitBackend = typeof onDocumentUploaded === "function";

    // Add files to uploading state immediately so they're visible
    const newUploadingFiles: UploadingFileState[] = validFiles.map((file) => {
      const uploadingFileId = `${file.name}-${Date.now()}-${Math.random()}`;
      if (shouldAwaitBackend) {
        successfulUploadIds.add(uploadingFileId);
      }
      return {
        id: uploadingFileId,
        fileName: file.name,
        fileType: file.type,
        progress: 0,
        stage: "processing" as const,
      };
    });

    if (shouldAwaitBackend) {
      setUploadingFiles(prev => [...prev, ...newUploadingFiles]);
    }

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const uploadingFile = newUploadingFiles[i];
        
        try {
          // Upload to S3 without progress tracking
          const fileUrl = await uploadToS3(file);

          const newDoc: UploadedDoc = {
            url: fileUrl,
            filename: file.name,
            type: file.type
          };
          uploadedDocsList.push(newDoc);

          // File is already in uploadingFiles state, just keep it in processing stage
        } catch (error) {
          errors.push(file.name);
          console.error(`Failed to upload ${file.name}:`, error);
          // Update error state for the file
          if (shouldAwaitBackend && uploadingFile) {
            setUploadingFiles(prev =>
              prev.map(f =>
                f.id === uploadingFile.id
                  ? { ...f, stage: "error" as const }
                  : f
              )
            );
          }
        }
      }

      if (uploadedDocsList.length > 0) {
        if (shouldAwaitBackend) {
          // Simulate progress updates during backend processing
          const progressSteps = [20, 50, 70];
          let currentStep = 0;
          let progressInterval: NodeJS.Timeout | null = null;
          
          // Start progress simulation
          const startProgressSimulation = () => {
            progressInterval = setInterval(() => {
              if (currentStep < progressSteps.length) {
                const progress = progressSteps[currentStep];
                setUploadingFiles(prev =>
                  prev.map(f =>
                    successfulUploadIds.has(f.id)
                      ? { ...f, progress }
                      : f
                  )
                );
                currentStep++;
              } else {
                // If we've reached the last step, keep it at 70% until backend completes
                if (progressInterval) {
                  clearInterval(progressInterval);
                  progressInterval = null;
                }
              }
            }, 600); // Update every 600ms
          };

          startProgressSimulation();

          try {
            await onDocumentUploaded?.(uploadedDocsList);
          } finally {
            if (progressInterval) {
              clearInterval(progressInterval);
            }
          }
        }

        setUploadedDocs(prev => mergeUploadedDocs(prev, uploadedDocsList));

        if (shouldAwaitBackend) {
          // Set to 100% when processing completes
          setUploadingFiles(prev =>
            prev.map(f =>
              successfulUploadIds.has(f.id)
                ? { ...f, progress: 100, stage: "completed" }
                : f
            )
          );

          setTimeout(() => {
            setUploadingFiles(prev =>
              prev.filter(f => !successfulUploadIds.has(f.id))
            );
          }, 1200);
        }
      }

      // Show error message if some files failed
      if (errors.length > 0) {
        toast.error(`Failed to upload the following files: ${errors.join(", ")}\n\n${uploadedDocsList.length} file(s) uploaded successfully.`);
      } else if (uploadedDocsList.length > 1) {
        // Success message for multiple files
        console.log(`Successfully uploaded ${uploadedDocsList.length} files`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocs(prev => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type === 'text/markdown') return '📋';
    if (type === 'application/json') return '��';
    if (type === 'text/plain') return '��';
    if (type === 'text/javascript') return '��';
    if (type === 'application/javascript') return '��';
    if (type === 'text/x-python') return '��';
    if (type === 'text/typescript') return '��';
    if (type === 'text/x-c++src') return '��';
    if (type === 'text/x-csrc') return '��';
    if (type === 'text/x-c') return '��';
    if (type === 'text/html') return '��';
    if (type === 'text/css') return '��';
    return '📄';
  };

  const getFileTypeLabel = (type: string) => {
    if (type.startsWith('image/')) return 'Image';
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'Word';
    if (type === 'text/markdown') return 'Markdown';
    if (type === 'application/json') return 'JSON';
    if (type === 'text/plain') return 'Plain Text';
    if (type === 'text/javascript') return 'JavaScript';
    if (type === 'application/javascript') return 'JavaScript';
    if (type === 'text/x-python') return 'Python';
    if (type === 'text/typescript') return 'TypeScript';
    if (type === 'text/x-c++src') return 'C++';
    if (type === 'text/x-csrc') return 'C';
    if (type === 'text/x-c') return 'C';
    if (type === 'text/html') return 'HTML';
    if (type === 'text/css') return 'CSS';
    return 'File';
  };

  const getUploadStatusLabel = (stage: UploadStage) => {
    if (stage === "processing") return "Processing";
    if (stage === "completed") return "Done";
    if (stage === "error") return "Error";
    return "Uploading";
  };

  const getUploadBarColor = (stage: UploadStage) => {
    if (stage === "error") return "bg-destructive";
    if (stage === "completed") return "bg-green-500";
    if (stage === "processing") return "bg-amber-500";
    return "bg-primary";
  };

  const canSend = Boolean(message.trim() || uploadedDocs.length > 0);
  const showVoiceShortcut = !canSend;

  return (
    <>
    <div className={`w-full max-w-4xl mx-auto ${hasMessages ? "" : "px-4"}`}>
      {/* Show uploading files with progress */}
      {visibleUploadingFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {visibleUploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm min-w-[200px]"
            >
              <span className="text-lg">{getFileIcon(uploadingFile.fileType)}</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium truncate max-w-[150px]" title={uploadingFile.fileName}>
                  {uploadingFile.fileName}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${getUploadBarColor(uploadingFile.stage)}`}
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[35px]">
                    {uploadingFile.stage === "processing"
                      ? `${uploadingFile.progress}%`
                      : getUploadStatusLabel(uploadingFile.stage)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Show uploaded files */}
      {uploadedDocs.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadedDocs.map((doc, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm"
            >
              <span className="text-lg">{getFileIcon(doc.type)}</span>
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate max-w-[120px]" title={doc.filename}>
                  {doc.filename}
                </span>
                <span className="text-xs text-muted-foreground">
                  {getFileTypeLabel(doc.type)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-muted-foreground hover:text-foreground"
                onClick={() => removeDocument(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative bg-muted/20 rounded-3xl shadow-sm border border-border overflow-hidden">
        <div className="p-3">
          {connected ? (
            <div className="w-full min-h-[50px] flex items-center justify-center">
              <LiveWaveform 
                stream={audioStream} 
                active={connected}
                height={80}
                barWidth={3}
                barGap={2}
                mode="static"
                fadeEdges={true}
                barColor="primary"
                historySize={120}
                className="w-full"
              />
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isUploading ? "Uploading documents..." : "Ask anything..."}
              disabled={isLoading || connecting || isUploading}
              className="w-full min-h-[50px] max-h-[200px] resize-none outline-none text-lg leading-snug bg-transparent placeholder:text-muted-foreground disabled:opacity-50 overflow-y-auto [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding"
              rows={2}
            />
          )}
        </div>

        <div className="flex flex-col gap-3 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedModel} onValueChange={handleModelChange} disabled={isLoading || connected || isUploading}>
              <SelectTrigger className="h-6 sm:h-7 px-2 rounded-full text-[11px] sm:text-sm border-border bg-muted hover:bg-accent focus:ring-0 focus:ring-offset-0 min-w-[95px] sm:min-w-[150px]">
                <div className="flex items-center gap-2">
                  <Sparkle className="size-4 text-primary" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent className="max-h-[400px] overflow-y-auto">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-1 p-2">
                  {models.map(model => (
                    <SelectItem key={model.value} value={model.value} className="text-sm">
                      <div className="flex items-center gap-2">
                        {model.name}
                      </div>
                    </SelectItem>
                  ))}
                </div>
              </SelectContent>
            </Select>

            <Button
              variant={webSearch ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setWebSearch(!webSearch)}
              disabled={isLoading || connected || isUploading}
            >
              <Globe className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={deepSearch ? "default" : "outline"}
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={() => setDeepSearch(!deepSearch)}
              disabled={isLoading || connected || isUploading}
            >
              <Telescope className="size-4"/>
            </Button>
            
            {gptId && (
              <ComposioToolSelector
                gptId={gptId}
                onToolsChange={setComposioTools}
                disabled={isLoading || connected || isUploading}
              />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <Button
              variant={connected ? "default" : "outline"}
              size="icon"
              className={cn(
                "h-7 w-7 rounded-full",
                connected && "bg-primary hover:bg-primary/90 text-white"
              )}
              onClick={handleVoiceToggle}
              disabled={isLoading || connecting}
              title={connected ? "Disconnect voice" : "Connect voice"}
            >
              {connected ? (
                <XCircle className="h-3.5 w-3.5 " />
              ) : (
                <AudioLines className="h-3.5 w-3.5" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,application/json,text/plain,text/javascript,application/javascript,text/x-python,text/typescript,text/x-c++src,text/x-csrc,text/x-c,text/html,text/css,.py,.js,.ts,.tsx,.jsx,.cpp,.c,.cc,.cxx,.h,.hpp,.java,.rb,.go,.rs,.php,.swift,.kt,.scala,.sh,.bash,.zsh,.fish,.ps1,.bat,.cmd,.html,.htm,.css"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-full"
              disabled={isLoading || isUploading || connected}
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip className="h-3.5 w-3.5" />
            </Button>

            <Button
              onClick={handleSend}
              disabled={(!message.trim() && uploadedDocs.length === 0) || isLoading || connected || isUploading || hasActiveUploads}
              size="icon"
              className="h-7 w-7 rounded-full"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
      <VoiceConfigDialog
        open={voiceDialogOpen}
        onOpenChange={setVoiceDialogOpen}
        value={voiceConfig}
        onSave={handleVoiceConfigSave}
        title="Choose Voice Models"
        description="Select STT and TTS providers before starting a voice session."
      />
    </>
  );
}
