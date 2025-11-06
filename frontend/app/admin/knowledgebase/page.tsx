import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getKnowledgeBases } from "@/data/get-knowledge-base";
import AddKnowledgeBase from "./_components/add-knowledge-base";
import KnowledgeBaseList from "./_components/knowledge-base-list";

async function KnowledgeBaseContent() {
  const knowledgeBases = await getKnowledgeBases();

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Knowledge Base</h1>
          <p className="text-muted-foreground/80 mt-1">
            Manage your knowledge base files and documents
          </p>
        </div>
        <AddKnowledgeBase />
      </div>

      <KnowledgeBaseList knowledgeBases={knowledgeBases} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <Card>
        <CardContent className="py-12">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function KnowledgeBasePage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <KnowledgeBaseContent />
    </Suspense>
  );
}
