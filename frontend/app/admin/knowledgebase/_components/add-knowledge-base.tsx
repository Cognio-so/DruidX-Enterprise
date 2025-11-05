"use client";

import { useState, useTransition } from "react";
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files);

    if (uploadedFiles.length + fileArray.length > 5) {
      toast.error("You can upload a maximum of 5 files at once");
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
    ];

    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      const isAllowed = allowedTypes.some((type) => file.type.startsWith(type));
      if (!isAllowed) {
        errors.push(file.name);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(
        `Invalid file type(s): ${errors.join(", ")}. Please upload PDF, Word, Markdown, JSON, text, or image files.`
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

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return "🖼️";
    if (type === "application/pdf") return "📄";
    if (type.includes("word") || type.includes("document")) return "📝";
    if (type === "text/markdown") return "📋";
    if (type === "application/json") return "📊";
    return "📄";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Upload className="h-4 w-4" />
          Add Knowledge Base
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Knowledge Base Entry</DialogTitle>
          <DialogDescription>
            Upload up to 5 files at once. Supported formats: PDF, Word, Markdown, JSON, Text, and Images.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              File Upload * (Up to 5 files)
              {uploadedFiles.length > 0 && (
                <span className="text-muted-foreground ml-2">
                  ({uploadedFiles.length}/5)
                </span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="file"
                type="file"
                onChange={handleFileUpload}
                disabled={isUploading || isPending || uploadedFiles.length >= 5}
                accept=".pdf,.doc,.docx,.md,.json,.txt,.png,.jpg,.jpeg,.gif,.webp"
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
                    <span className="text-lg">{getFileIcon(file.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.fileName}</p>
                      <p className="text-xs text-muted-foreground truncate">{file.url}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFile(index)}
                      disabled={isPending || isUploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setName("");
                setUploadedFiles([]);
              }}
              disabled={isPending || isUploading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || isUploading || uploadedFiles.length === 0}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create {uploadedFiles.length > 1 ? `(${uploadedFiles.length})` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
