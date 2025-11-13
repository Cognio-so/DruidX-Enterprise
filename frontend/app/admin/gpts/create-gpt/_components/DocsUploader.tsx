"use client";

import {
  AlertCircleIcon,
  CloudUploadIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  VideoIcon,
  XIcon,
  Loader2,
  ChevronsUpDown,
  CheckIcon as Check,
} from "lucide-react";

import { formatBytes } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useState, useCallback, useRef, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandList,
  CommandItem,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";

interface KnowledgeBaseEntry {
  id: string;
  name: string;
  url: string;
  fileType: string | null;
}

interface KnowledgeBaseGroup {
  baseName: string;
  files: Array<{
    id: string;
    name: string;
    url: string;
    fileType: string | null;
  }>;
}

type DocsUploaderProps = {
  value: string[]; 
  onChange: (urls: string[]) => void;
  knowledgeBases?: KnowledgeBaseEntry[];
};

type UploadingFile = {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
};

const getFileIcon = (fileName: string, fileType?: string) => {
  const type = fileType || "";
  const name = fileName.toLowerCase();

  if (
    type.includes("pdf") ||
    name.endsWith(".pdf") ||
    type.includes("word") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  } else if (
    type.includes("zip") ||
    type.includes("archive") ||
    name.endsWith(".zip") ||
    name.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  } else if (
    type.includes("excel") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  } else if (type.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  } else if (type.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  } else if (type.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

export default function DocsUploader({ value, onChange, knowledgeBases = [] }: DocsUploaderProps) {
  const maxSize = 100 * 1024 * 1024; // 100MB
  const maxFiles = 10;
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const groupKnowledgeBases = (kbEntries: KnowledgeBaseEntry[]): KnowledgeBaseGroup[] => {
    const groups = new Map<string, KnowledgeBaseGroup>();

    kbEntries.forEach((entry) => {
      const baseName = entry.name.split(" - ")[0];
      
      if (!groups.has(baseName)) {
        groups.set(baseName, {
          baseName,
          files: [],
        });
      }

      const fileName = entry.name.includes(" - ") 
        ? entry.name.split(" - ")[1] 
        : entry.name;

      groups.get(baseName)!.files.push({
        id: entry.id,
        name: fileName,
        url: entry.url,
        fileType: entry.fileType,
      });
    });

    return Array.from(groups.values());
  };

  const groupedKnowledgeBases = useMemo(
    () => groupKnowledgeBases(knowledgeBases),
    [knowledgeBases]
  );

  // Track all knowledge base URLs to distinguish from user-uploaded files
  const knowledgeBaseUrls = useMemo(() => {
    const urls = new Set<string>();
    groupedKnowledgeBases.forEach((group) => {
      group.files.forEach((file) => {
        urls.add(file.url);
      });
    });
    return urls;
  }, [groupedKnowledgeBases]);

  const selectedKnowledgeBases = useMemo(() => {
    return groupedKnowledgeBases
      .filter((group) =>
        group.files.every((file) => value.includes(file.url))
      )
      .map((group) => group.baseName);
  }, [groupedKnowledgeBases, value]);

  const toggleKnowledgeBase = (baseName: string) => {
    const selectedGroup = groupedKnowledgeBases.find(
      (kb) => kb.baseName === baseName
    );
    if (!selectedGroup) return;

    const groupUrls = selectedGroup.files.map((file) => file.url);
    const isAlreadySelected = groupUrls.every((url) => value.includes(url));

    if (isAlreadySelected) {
      const remaining = value.filter((url) => !groupUrls.includes(url));
      onChange(remaining);
      setErrors([]);
      return;
    }

    const uniqueNewUrls = groupUrls.filter((url) => !value.includes(url));
    const combinedCount = value.length + uniqueNewUrls.length;

    if (combinedCount > maxFiles) {
      setErrors([
        `Adding this knowledge base would exceed the maximum of ${maxFiles} files.`,
      ]);
      return;
    }

    onChange([...value, ...uniqueNewUrls]);
    setErrors([]);
  };

  const handleRemoveKnowledgeBase = (baseName: string) => {
    const selectedGroup = groupedKnowledgeBases.find(
      (kb) => kb.baseName === baseName
    );
    if (!selectedGroup) return;

    const groupUrls = selectedGroup.files.map((file) => file.url);
    const remaining = value.filter((url) => !groupUrls.includes(url));
    onChange(remaining);
    setErrors([]);
  };

  const uploadToS3 = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    // Step 1: Get presigned URL from your API
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

    // Step 2: Upload file to S3 using XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          onProgress(100);
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

  const deleteFromS3 = async (url: string) => {
    const key = url.split("/").pop();
    if (!key) return;

    const response = await fetch("/api/s3/delete", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ key }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete file");
    }
  };

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File "${file.name}" exceeds the maximum size of ${formatBytes(maxSize)}.`;
    }

    // Check file type restrictions from your API
    const allowedTypes = [
      "image/",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/markdown",
      "application/json",
    ];

    // Check MIME type
    const isAllowedByMime = allowedTypes.some(type => file.type.startsWith(type));
    
    // Also check file extension as fallback (some browsers don't detect .md as text/markdown)
    const fileName = file.name.toLowerCase();
    const allowedExtensions = [".md", ".markdown"];
    const isAllowedByExtension = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isAllowedByMime && !isAllowedByExtension) {
      return `File "${file.name}" is not an accepted file type.`;
    }

    return null;
  };

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newErrors: string[] = [];

    // Check if adding these files would exceed maxFiles
    if (value.length + fileArray.length > maxFiles) {
      newErrors.push(`You can only upload a maximum of ${maxFiles} files.`);
      setErrors(newErrors);
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        newErrors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (newErrors.length > 0) {
      setErrors(newErrors);
    }

    if (validFiles.length === 0) return;

    // Start uploading valid files
    const newUploadingFiles: UploadingFile[] = validFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Upload files concurrently
    const uploadPromises = newUploadingFiles.map(async (uploadingFile) => {
      try {
        const url = await uploadToS3(uploadingFile.file, (progress) => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, progress } : f
            )
          );
        });

        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: "completed" as const, url }
              : f
          )
        );

        // Add to value after successful upload
        onChange([...value, url]);

        // Remove from uploading files after a delay
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
        }, 1000);

        return url;
      } catch (error) {
        console.error("Upload error:", error);
        setUploadingFiles(prev =>
          prev.map(f =>
            f.id === uploadingFile.id
              ? { ...f, status: "error" as const }
              : f
          )
        );
        throw error;
      }
    });

    try {
      await Promise.all(uploadPromises);
    } catch (error) {
      // Individual file errors are handled above
    }
  }, [value, onChange, maxFiles, maxSize, validateFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) {
      return;
    }
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const openFileDialog = () => {
    inputRef.current?.click();
  };

  const removeFile = async (url: string) => {
    // Only delete from S3 if it's a user-uploaded file (not from knowledge base)
    const isKnowledgeBaseFile = knowledgeBaseUrls.has(url);
    
    if (!isKnowledgeBaseFile) {
      try {
        await deleteFromS3(url);
      } catch (error) {
        console.error("Delete error:", error);
        // Continue to remove from UI even if S3 delete fails
      }
    }
    
    // Always remove from the value array (UI update)
    onChange(value.filter(u => u !== url));
  };

  const clearFiles = async () => {
    // Only delete user-uploaded files from S3 (not knowledge base files)
    const userUploadedUrls = value.filter(url => !knowledgeBaseUrls.has(url));
    const deletePromises = userUploadedUrls.map(url => deleteFromS3(url));
    try {
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Delete error:", error);
    }
    onChange([]);
  };

  const removeUploadingFile = (id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  };

  const allFiles = [
    ...value.map((url, index) => ({
      id: `uploaded-${index}`,
      name: url.split("/").pop() || `file-${index}`,
      url,
      size: 0, // We don't have size info for uploaded files
      type: "uploaded" as const,
    })),
    ...uploadingFiles.map(f => ({
      id: f.id,
      name: f.file.name,
      url: f.url,
      size: f.file.size,
      type: f.status, // Remove "as const" here
      progress: f.progress,
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Knowledge Base Selector */}
      {groupedKnowledgeBases.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label htmlFor="knowledge-base-select">Select from Knowledge Base</Label>
          <Popover open={knowledgeBaseOpen} onOpenChange={setKnowledgeBaseOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                role="combobox"
                aria-expanded={knowledgeBaseOpen}
                className="w-full justify-between"
                id="knowledge-base-select"
              >
                {selectedKnowledgeBases.length > 0
                  ? `${selectedKnowledgeBases.length} selected`
                  : "Choose knowledge bases"}
                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 max-w-full p-0" align="start">
              <Command>
                <CommandInput placeholder="Search knowledge bases..." />
                <CommandList>
                  <CommandEmpty>No knowledge bases found.</CommandEmpty>
                  <CommandGroup>
                    {groupedKnowledgeBases.map((kb) => {
                      const isSelected = selectedKnowledgeBases.includes(kb.baseName);
                      return (
                        <CommandItem
                          key={kb.baseName}
                          value={kb.baseName}
                          onSelect={() => toggleKnowledgeBase(kb.baseName)}
                          className="flex items-center justify-between gap-3"
                        >
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{kb.baseName}</span>
                            <span className="text-xs text-muted-foreground">
                              {kb.files.length} file{kb.files.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <Check
                            className={`size-4 transition-opacity duration-150 ${isSelected ? "opacity-100" : "opacity-0"}`}
                          />
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          {selectedKnowledgeBases.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedKnowledgeBases.map((baseName) => (
                <Badge
                  key={baseName}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {baseName}
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRemoveKnowledgeBase(baseName);
                    }}
                    aria-label={`Remove ${baseName}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drop area */}
      <div
        role="button"
        onClick={openFileDialog}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        data-dragging={isDragging || undefined}
        className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 has-[input:focus]:border-ring has-[input:focus]:ring-ring/50 flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed p-4 transition-colors has-disabled:pointer-events-none has-disabled:opacity-50 has-[input:focus]:ring-[3px]"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,.md,.markdown,application/json"
          onChange={handleFileChange}
          className="sr-only"
          aria-label="Upload files"
        />

        <div className="flex flex-col items-center justify-center text-center">
          <div
            className="bg-background mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border"
            aria-hidden="true"
          >
            <CloudUploadIcon className="size-4 opacity-60" />
          </div>
          <p className="mb-1.5 text-sm font-medium">Upload files</p>
          <p className="text-muted-foreground mb-2 text-xs">
            Drag & drop or click to browse
          </p>
          <div className="text-muted-foreground/70 flex flex-wrap justify-center gap-1 text-xs">
            <span>Images, PDFs, Word docs, Markdown, JSON</span>
            <span>∙</span>
            <span>Max {maxFiles} files</span>
            <span>∙</span>
            <span>Up to {formatBytes(maxSize)}</span>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className="text-destructive flex items-center gap-1 text-xs"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}

      {/* File list */}
      {allFiles.length > 0 && (
        <div className="space-y-2">
          {allFiles.map((file) => (
            <div
              key={file.id}
              className="bg-background flex items-center justify-between gap-2 rounded-lg border p-2 pe-3"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                  {getFileIcon(file.name)}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-[13px] font-medium">
                    {file.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {file.size > 0 ? formatBytes(file.size) : "Uploaded"}
                  </p>
                  {file.type === "uploading" && (
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {file.type === "uploading" && (
                  <Loader2 className="size-4 animate-spin text-blue-600" />
                )}
                {file.type === "error" && (
                  <AlertCircleIcon className="size-4 text-red-600" />
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground/80 hover:text-foreground -me-2 size-8 hover:bg-transparent"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (file.type === "uploading") {
                      removeUploadingFile(file.id);
                    } else if (file.url) {
                      removeFile(file.url);
                    }
                  }}
                  aria-label="Remove file"
                >
                  <XIcon className="size-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}

          {/* Remove all files button */}
          {value.length > 1 && (
            <div>
              <Button 
                type="button"
                size="sm" 
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  clearFiles();
                }}
              >
                Remove all files
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
