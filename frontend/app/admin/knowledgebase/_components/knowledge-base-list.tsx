"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { KnowledgeBasePreviewDialog } from "./knowledge-base-preview-dialog";

interface KnowledgeBase {
  id: string;
  name: string;
  url: string;
  fileType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface KnowledgeBaseListProps {
  knowledgeBases: KnowledgeBase[];
}

interface GroupedKnowledgeBase {
  baseName: string;
  files: KnowledgeBase[];
  createdAt: Date;
}

function groupKnowledgeBases(kbEntries: KnowledgeBase[]): GroupedKnowledgeBase[] {
  const groups = new Map<string, GroupedKnowledgeBase>();

  kbEntries.forEach((entry) => {
    const baseName = entry.name.split(" - ")[0];

    if (!groups.has(baseName)) {
      groups.set(baseName, {
        baseName,
        files: [],
        createdAt: entry.createdAt,
      });
    }

    groups.get(baseName)!.files.push(entry);
  });

  return Array.from(groups.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
  );
}

export default function KnowledgeBaseList({
  knowledgeBases,
}: KnowledgeBaseListProps) {
  const [previewBaseName, setPreviewBaseName] = useState<string | null>(null);
  const grouped = groupKnowledgeBases(knowledgeBases);

  if (knowledgeBases.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">No docs present</p>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            You haven&apos;t added any knowledge base documents yet. Click the &quot;Add Knowledge Base&quot;
            button above to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  const selectedGroup = grouped.find((g) => g.baseName === previewBaseName);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {grouped.map((group) => (
          <Card key={group.baseName} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg truncate">{group.baseName}</CardTitle>
                  <CardDescription className="mt-1">
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-3 w-3" />
                      <span className="text-xs">
                        {format(new Date(group.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="ml-2">
                  {group.files.length} {group.files.length === 1 ? "file" : "files"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="default"
                className="w-full"
                onClick={() => setPreviewBaseName(group.baseName)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedGroup && (
        <KnowledgeBasePreviewDialog
          open={previewBaseName !== null}
          onOpenChange={(open) => !open && setPreviewBaseName(null)}
          baseName={selectedGroup.baseName}
          files={selectedGroup.files.map((file) => ({
            id: file.id,
            name: file.name.includes(" - ") ? file.name.split(" - ")[1] : file.name,
            url: file.url,
            fileType: file.fileType,
          }))}
        />
      )}
    </>
  );
}
