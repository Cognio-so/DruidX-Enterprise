"use client";

import { useState, useEffect } from "react";
import { ComposioToolCard } from "./composio-tool-card";
import { GptSelector } from "./gpt-selector";
import { Input } from "@/components/ui/input";
import { Search, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ComposioTool {
  name: string;
  slug: string;
  auth_config_id: string;
  logo: string;
  description: string;
  tools: string[];
}

interface Connection {
  id: string;
  app_name: string;
  status: string;
}

interface Gpt {
  id: string;
  name: string;
  description: string | null;
}

interface ComposioToolsGridProps {
  initialTools: ComposioTool[];
  gptId?: string;
  gpts?: Gpt[];
}

export function ComposioToolsGrid({
  initialTools,
  gptId,
  gpts = [],
}: ComposioToolsGridProps) {
  const [tools, setTools] = useState<ComposioTool[]>(initialTools);
  const [filteredTools, setFilteredTools] = useState<ComposioTool[]>(initialTools);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [connectionIds, setConnectionIds] = useState<Record<string, string>>({});
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (gptId) {
      fetchConnections();
    }
  }, [gptId]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTools(tools);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = tools.filter(
      (tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.description.toLowerCase().includes(query) ||
        tool.tools.some((t) => t.toLowerCase().includes(query))
    );
    setFilteredTools(filtered);
  }, [searchQuery, tools]);

  const fetchConnections = async () => {
    if (!gptId) return;

    try {
      setRefreshing(true);
      const response = await fetch(`/api/mcp/connections/${gptId}`);

      if (response.ok) {
        const data = await response.json();
        const connectedApps =
          data.connections?.map((conn: Connection) => conn.app_name?.toLowerCase()) || [];

        const connectionIdMap: Record<string, string> = {};
        data.connections?.forEach((conn: Connection) => {
          if (conn.app_name) {
            connectionIdMap[conn.app_name.toLowerCase()] = conn.id;
          }
        });

        setConnectionIds(connectionIdMap);
        setActiveConnections(connectedApps);
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleConnect = async (toolSlug: string) => {
    if (!gptId) {
      toast.error("GPT ID is required to connect tools");
      return;
    }

    try {
      const response = await fetch("/api/mcp/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gpt_id: gptId,
          app_name: toolSlug,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        window.location.href = data.redirect_url;
        toast.success(`Redirecting to ${toolSlug} authentication...`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to initiate connection");
      }
    } catch (error) {
      console.error("Error connecting tool:", error);
      toast.error("Failed to connect tool");
      throw error;
    }
  };

  const handleDisconnect = async (toolSlug: string) => {
    const connectionId = connectionIds[toolSlug.toLowerCase()];

    if (!connectionId) {
      toast.error("Connection ID not found");
      return;
    }

    if (!gptId) {
      toast.error("GPT ID is required");
      return;
    }

    try {
      const response = await fetch("/api/mcp/disconnect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gpt_id: gptId,
          connection_id: connectionId,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("Tool disconnected successfully");
        setEnabledTools((prev) => prev.filter((t) => t !== toolSlug));
        setTimeout(() => {
          fetchConnections();
        }, 1000);
      } else {
        toast.error(result.error || "Failed to disconnect tool");
      }
    } catch (error) {
      console.error("Error disconnecting tool:", error);
      toast.error("Failed to disconnect tool");
      throw error;
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mcp/available-tools", {
        next: { 
          revalidate: 300, 
          tags: ['composio-tools']
        },
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTools(data.tools || []);
        toast.success("Tools refreshed");
      } else {
        toast.error("Failed to refresh tools");
      }
    } catch (error) {
      console.error("Error refreshing tools:", error);
      toast.error("Failed to refresh tools");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = (toolSlug: string) => {
    return activeConnections.includes(toolSlug.toLowerCase());
  };

  const isEnabled = (toolSlug: string) => {
    return enabledTools.includes(toolSlug);
  };

  const handleToggle = (toolSlug: string, enabled: boolean) => {
    if (enabled) {
      setEnabledTools((prev) => [...prev, toolSlug]);
    } else {
      setEnabledTools((prev) => prev.filter((t) => t !== toolSlug));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tools by name, description, or capabilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <GptSelector gpts={gpts} currentGptId={gptId} />
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin text-primary" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2 text-primary" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {filteredTools.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? (
            <>
              <p className="text-lg font-medium">No tools found</p>
              <p className="text-sm mt-2">
                Try adjusting your search query
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-medium">No tools available</p>
              <p className="text-sm mt-2">
                Check your backend connection
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTools.map((tool) => (
            <ComposioToolCard
              key={tool.slug}
              tool={tool}
              isConnected={isConnected(tool.slug)}
              isEnabled={isEnabled(tool.slug)}
              onConnect={gptId ? handleConnect : undefined}
              onDisconnect={gptId ? handleDisconnect : undefined}
              onToggle={handleToggle}
              gptId={gptId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

