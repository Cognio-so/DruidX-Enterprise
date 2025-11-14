"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { createKnowledgeBase } from "../action";

interface UploadedFile {
  url: string;
  fileName: string;
  fileType: string;
}

interface AddKnowledgeBaseProps {
  onSuccess?: () => void;
}

export default function AddKnowledgeBase({ onSuccess }: AddKnowledgeBaseProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [name, setName] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const uploadToS3 = async (file: File): Promise<{ fileUrl: string; fileType: string }> => {
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

    const { uploadUrl, fileUrl: uploadedUrl } = await response.json();

    await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    return { fileUrl: uploadedUrl, fileType: file.type };
  };

  const deleteFromS3 = async (url: string) => {
    try {
      // Extract key from URL (last part after the last slash)
      const key = url.split("/").pop();
      if (!key) {
        console.warn("Could not extract key from URL:", url);
        return;
      }

      const response = await fetch("/api/s3/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to delete file from S3:", error);
      }
    } catch (error) {
      console.error("Error deleting file from S3:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (uploadedFiles.length + fileArray.length > 15) {
      toast.error("You can upload a maximum of 15 files at once");
      return;
    }

    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/markdown",
      "application/json",
      "text/plain",
      "text/csv",
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/webm",
    ];

    // Also check file extensions for formats that might not have consistent MIME types
    const allowedExtensions = [".docx", ".csv", ".txt", ".md", ".pdf", ".json", ".jpg", ".jpeg", ".png", ".webp", ".mp3", ".wav"];

    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      const isAllowedByType = allowedTypes.some((type) => file.type.startsWith(type));
      const isAllowedByExtension = allowedExtensions.some((ext) => fileExtension === ext);
      
      if (!isAllowedByType && !isAllowedByExtension) {
        errors.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(
        `Invalid file type(s): ${errors.join(", ")}. Please upload PDF, Word (docx), CSV, Markdown (.md), JSON, Text (.txt), Images (jpg, png, webp), or Audio (mp3, wav) files.`
      );
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    const uploadedList: UploadedFile[] = [];

    try {
      for (const file of validFiles) {
        try {
          const { fileUrl, fileType } = await uploadToS3(file);
          uploadedList.push({
            url: fileUrl,
            fileName: file.name,
            fileType,
          });
        } catch (error) {
          errors.push(file.name);
          console.error(`Failed to upload ${file.name}:`, error);
        }
      }

      if (uploadedList.length > 0) {
        setUploadedFiles((prev) => [...prev, ...uploadedList]);
        toast.success(`Successfully uploaded ${uploadedList.length} file(s)`);
      }

      if (errors.length > 0) {
        toast.error(`Failed to upload: ${errors.join(", ")}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const removeFile = async (index: number) => {
    const fileToRemove = uploadedFiles[index];
    if (fileToRemove?.url) {
      await deleteFromS3(fileToRemove.url);
    }
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const cleanupUploadedFiles = async () => {
    // Delete all uploaded files from S3
    const deletePromises = uploadedFiles.map((file) => deleteFromS3(file.url));
    await Promise.allSettled(deletePromises);
    setUploadedFiles([]);
    setName("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a name");
      return;
    }

    if (uploadedFiles.length === 0) {
      toast.error("Please upload at least one file");
      return;
    }

    startTransition(async () => {
      try {
        const filesData = uploadedFiles.map((file) => ({
          url: file.url,
          fileType: file.fileType,
          fileName: file.fileName,
        }));

        const result = await createKnowledgeBase({
          name: name.trim(),
          files: filesData,
        });

        if (result.success) {
          toast.success(
            `Successfully created ${uploadedFiles.length} knowledge base ${uploadedFiles.length === 1 ? "entry" : "entries"}`
          );
          setOpen(false);
          setName("");
          setUploadedFiles([]);
          router.refresh();
          onSuccess?.();
        } else {
          toast.error(result.error || "Failed to create knowledge base entries");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create knowledge base entries"
        );
      }
    });
  };

  const getFileIcon = (type: string, fileName: string) => {
    const extension = fileName.split(".").pop()?.toLowerCase();
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type.includes("word") || type.includes("document") || extension === "docx") return "📝";
    if (type === "text/markdown" || extension === "md") return "📋";
    if (type === "application/json" || extension === "json") return "📊";
    if (type === "text/csv" || extension === "csv") return "📈";
    if (type.startsWith("audio/") || extension === "mp3" || extension === "wav") return "🎵";
    if (type === "text/plain" || extension === "txt") return "📃";
    return "📄";
  };

  const handleDialogOpenChange = async (newOpen: boolean) => {
    if (!newOpen && uploadedFiles.length > 0) {
      // Dialog is being closed, cleanup uploaded files
      await cleanupUploadedFiles();
    }
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Add Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[1000px] max-w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-primary">Add Knowledge Base Entry</DialogTitle>
          <DialogDescription className="text-muted-foreground/80">
            Upload up to 15 files at once.
          </DialogDescription>
          
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1 -mr-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter knowledge base name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="file">
              File Upload * (Up to 15 files)
              {uploadedFiles.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({uploadedFiles.length}/15)
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading || isPending || uploadedFiles.length >= 15}
                accept=".pdf,.doc,.docx,.csv,.md,.markdown,.json,.txt,.png,.jpg,.jpeg,.webp,.mp3,.wav"
                className="flex-1"
                multiple
              />
            </div>
            {isUploading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </div>
            )}
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 mt-2">
                {uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 rounded-md border bg-muted/50"
                  >
                    <span className="text-lg flex-shrink-0">{getFileIcon(file.fileType, file.fileName)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground break-words line-clamp-2">{file.url}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFile(index)}
                      disabled={isPending || isUploading}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await cleanupUploadedFiles();
              setOpen(false);
            }}
            disabled={isPending || isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              if (formRef.current) {
                formRef.current.requestSubmit();
              }
            }}
            disabled={isPending || isUploading || uploadedFiles.length === 0}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create {uploadedFiles.length > 1 ? `(${uploadedFiles.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
