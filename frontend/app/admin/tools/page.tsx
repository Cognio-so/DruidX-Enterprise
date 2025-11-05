import { Suspense } from "react";
import { ComposioToolsGrid } from "./_components/composio-tools-grid";
import ToolsLoading from "./loading";
import { getGpts } from "@/data/get-gpts";



async function getComposioTools() {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    const response = await fetch(`${backendUrl}/api/mcp/available-tools`, {
      next: { 
        revalidate: 300, 
        tags: ['composio-tools']
      },
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch tools: ${response.status}`);
    }

    const data = await response.json();
    return data.tools || [];
  } catch (error) {
    console.error("Error fetching Composio tools:", error);
    return [];
  }
}

interface ToolsPageProps {
  searchParams: Promise<{ gptId?: string }>;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  const [tools, gpts] = await Promise.all([
    getComposioTools(),
    getGpts(),
  ]);
  const params = await searchParams;
  const gptId = params?.gptId;

  return (
    <div className="container mx-auto py-6 space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Tools</h1>
        <p className="text-muted-foreground">
          Browse and connect to available tools. These tools enable
          your GPTs to interact with external services and platforms.
        </p>
      </div>

      <Suspense fallback={<ToolsLoading />}>
        <ComposioToolsGrid initialTools={tools} gptId={gptId} gpts={gpts} />
      </Suspense>
    </div>
  );
}
