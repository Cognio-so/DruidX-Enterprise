import { Suspense } from "react";
import { ComposioToolsGrid } from "./_components/composio-tools-grid";
import { GptSelector } from "./_components/gpt-selector";
import ToolsLoading from "./loading";
import { Metadata } from "next";
import { getGpts } from "@/data/get-gpts";

export const metadata: Metadata = {
  title: "Composio Tools | EMSA",
  description: "Browse and manage all available Composio integration tools",
};

// Fetch tools on the server for better performance
async function getComposioTools() {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    // Use Next.js fetch with caching
    const response = await fetch(`${backendUrl}/api/mcp/available-tools`, {
      next: { 
        revalidate: 300, // Revalidate every 5 minutes
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
    // Return empty array on error - client can retry
    return [];
  }
}

interface ToolsPageProps {
  searchParams: Promise<{ gptId?: string }>;
}

export default async function ToolsPage({ searchParams }: ToolsPageProps) {
  // Fetch tools and GPTs on the server
  const [tools, gpts] = await Promise.all([
    getComposioTools(),
    getGpts(),
  ]);
  // Await searchParams before accessing properties (Next.js 15+ requirement)
  const params = await searchParams;
  const gptId = params?.gptId;

  return (
    <div className="container mx-auto py-6 space-y-6 p-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Composio Tools</h1>
        <p className="text-muted-foreground">
          Browse and connect to available Composio integration tools. These tools enable
          your GPTs to interact with external services and platforms.
          {tools.length > 0 && (
            <span className="block mt-1 text-sm font-medium">
              {tools.length} MCP tools available
            </span>
          )}
        </p>
      </div>

      <Suspense fallback={<ToolsLoading />}>
        <ComposioToolsGrid initialTools={tools} gptId={gptId} gpts={gpts} />
      </Suspense>
    </div>
  );
}
