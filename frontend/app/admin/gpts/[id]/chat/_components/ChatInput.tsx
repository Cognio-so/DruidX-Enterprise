"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, Globe, Paperclip, Sparkle, Telescope, X, Phone, PhoneOff, AudioLines, XCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { getModelsForFrontend, frontendToBackend, getDisplayName } from "@/lib/modelMapping";
import { ComposioToolSelector } from "./ComposioToolSelector";
import { useVoiceChat } from "@/hooks/use-voice-chat";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
}

interface UploadedDoc {
  url: string;
  filename: string;
  type: string;
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
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt_4o");
  const [webSearch, setWebSearch] = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [composioTools, setComposioTools] = useState<string[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{
    id: string;
    file: File;
    progress: number;
    status: 'uploading' | 'completed' | 'error';
  }>>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice chat integration
  const { connected, connecting, error, connect, disconnect, audioStream } = useVoiceChat({
    sessionId: sessionId || null,
    gptId,
    onMessage: onVoiceMessage,
  });

  // Notify parent when voice connection changes
  useEffect(() => {
    onVoiceConnectionChange?.(connected);
  }, [connected, onVoiceConnectionChange]);

  const handleVoiceToggle = async () => {
    if (connected) {
      await disconnect();
    } else {
      await connect();
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
    if ((message.trim() || uploadedDocs.length > 0) && !isLoading && !isUploading && uploadingFiles.length === 0) {
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

  const uploadToS3 = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
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

    // Use XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          if (onProgress) onProgress(100);
          resolve(fileUrl);
        } else {
          reject(new Error("Upload failed"));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    });
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
    ];

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
      const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
      if (!isAllowed) {
        invalidFiles.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (invalidFiles.length > 0) {
      toast.error(`The following files are not supported: ${invalidFiles.join(", ")}\n\nPlease upload PDF, Word document, Markdown, JSON, or image files only.`);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      if (validFiles.length === 0) return;
    }

    setIsUploading(true);
    const uploadedDocsList: UploadedDoc[] = [];
    const errors: string[] = [];

    // Create uploading files state with unique IDs
    const newUploadingFiles = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const uploadingFile of newUploadingFiles) {
        try {
          const fileUrl = await uploadToS3(uploadingFile.file, (progress) => {
            setUploadingFiles(prev =>
              prev.map(f =>
                f.id === uploadingFile.id ? { ...f, progress } : f
              )
            );
          });

          const newDoc: UploadedDoc = {
            url: fileUrl,
            filename: uploadingFile.file.name,
            type: uploadingFile.file.type
          };
          uploadedDocsList.push(newDoc);

          // Mark as completed
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, status: 'completed' as const, progress: 100 } : f
            )
          );

          // Remove from uploading after a short delay
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
          }, 500);
        } catch (error) {
          errors.push(uploadingFile.file.name);
          console.error(`Failed to upload ${uploadingFile.file.name}:`, error);
          
          // Mark as error
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, status: 'error' as const } : f
            )
          );

          // Remove error files after a delay
          setTimeout(() => {
            setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
          }, 2000);
        }
      }

      // Add all successfully uploaded docs to state
      if (uploadedDocsList.length > 0) {
        setUploadedDocs(prev => [...prev, ...uploadedDocsList]);
        // Batch upload all documents as an array to backend
        await onDocumentUploaded?.(uploadedDocsList);
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
    if (type === 'application/json') return '📊';
    return '📄';
  };

  const getFileTypeLabel = (type: string) => {
    if (type.startsWith('image/')) return 'Image';
    if (type === 'application/pdf') return 'PDF';
    if (type.includes('word') || type.includes('document')) return 'Word';
    if (type === 'text/markdown') return 'Markdown';
    if (type === 'application/json') return 'JSON';
    return 'File';
  };

  return (
    <div className={`w-full max-w-4xl mx-auto ${hasMessages ? "" : "px-4"}`}>
      {/* Show uploading files with progress */}
      {uploadingFiles.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {uploadingFiles.map((uploadingFile) => (
            <div
              key={uploadingFile.id}
              className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm min-w-[200px]"
            >
              <span className="text-lg">{getFileIcon(uploadingFile.file.type)}</span>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-medium truncate max-w-[120px]" title={uploadingFile.file.name}>
                  {uploadingFile.file.name}
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        uploadingFile.status === 'error' 
                          ? 'bg-destructive' 
                          : uploadingFile.status === 'completed'
                          ? 'bg-green-500'
                          : 'bg-primary'
                      }`}
                      style={{ width: `${uploadingFile.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground min-w-[35px]">
                    {uploadingFile.status === 'error' 
                      ? 'Error' 
                      : uploadingFile.status === 'completed'
                      ? 'Done'
                      : `${uploadingFile.progress}%`}
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
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isUploading ? "Uploading documents..." : "Ask anything..."}
              disabled={isLoading || connecting || isUploading}
              className="w-full min-h-[50px] resize-none outline-none text-lg leading-snug bg-transparent placeholder:text-muted-foreground disabled:opacity-50"
              rows={2}
            />
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={handleModelChange} disabled={isLoading || connected || isUploading}>
              <SelectTrigger className="h-7 px-2 rounded-full text-sm border-border bg-muted hover:bg-accent focus:ring-0 focus:ring-offset-0">
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

          <div className="flex items-center gap-1.5">
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
              accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,application/json"
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
              disabled={(!message.trim() && uploadedDocs.length === 0) || isLoading || connected || isUploading || uploadingFiles.length > 0}
              size="icon"
              className="h-7 w-7 rounded-full"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
