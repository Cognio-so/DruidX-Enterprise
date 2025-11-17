import { Suspense } from "react";
import { ComposioToolsGrid } from "./_components/composio-tools-grid";
import ToolsLoading from "./loading";
import { getAdminGpts } from "@/data/get-admin-gpts";
import { SidebarTrigger } from "@/components/ui/sidebar";



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
    getAdminGpts(),
  ]);
  const params = await searchParams;
  const gptId = params?.gptId;

  return (
    <div className="container mx-auto py-6 space-y-6 p-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9 md:hidden" />
          <h1 className="text-3xl font-bold tracking-tight text-primary">External Tools</h1>
        </div>
        <p className="text-muted-foreground/80">
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
