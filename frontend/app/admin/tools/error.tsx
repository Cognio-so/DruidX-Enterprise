"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Tools page error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Alert className="max-w-md">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading tools</AlertTitle>
        <AlertDescription className="mt-2">
          {error.message || "An unexpected error occurred while loading Composio tools."}
        </AlertDescription>
        <div className="mt-4">
          <Button onClick={reset} variant="outline" size="sm">
            Try again
          </Button>
        </div>
      </Alert>
    </div>
  );
}

