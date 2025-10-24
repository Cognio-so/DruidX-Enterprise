"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CheckCircle, ExternalLink, Loader2, Settings, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface ComposioTool {
  name: string;
  slug: string;
  auth_config_id: string;
  logo: string;
  description: string;
  tools: string[];
}

interface ComposioToolSelectorProps {
  gptId: string;
  onToolsChange: (tools: string[]) => void;
  disabled?: boolean;
}

export function ComposioToolSelector({ 
  gptId, 
  onToolsChange, 
  disabled = false 
}: ComposioToolSelectorProps) {
  const [availableTools, setAvailableTools] = useState<ComposioTool[]>([]);
  const [activeConnections, setActiveConnections] = useState<string[]>([]);
  const [enabledTools, setEnabledTools] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);

  // Fetch available tools
  useEffect(() => {
    const fetchAvailableTools = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/mcp/available-tools");
        if (response.ok) {
          const data = await response.json();
          setAvailableTools(data.tools || []);
        } else {
          toast.error("Failed to fetch available tools");
        }
      } catch (error) {
        console.error("Error fetching tools:", error);
        toast.error("Failed to fetch available tools");
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableTools();
  }, []);

  // Fetch active connections
  const fetchConnections = async (showToast = false) => {
    try {
      if (showToast) {
        setRefreshing(true);
      }
      const response = await fetch(`/api/mcp/connections/${gptId}`);
      if (response.ok) {
        const data = await response.json();
        const connectedApps = data.connections?.map((conn: any) => 
          conn.app_name?.toLowerCase()
        ) || [];
        setActiveConnections(connectedApps);
        if (showToast) {
          toast.success("Connections refreshed");
        }
      }
    } catch (error) {
      console.error("Error fetching connections:", error);
      if (showToast) {
        toast.error("Failed to refresh connections");
      }
    } finally {
      if (showToast) {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    if (gptId) {
      fetchConnections();
    }
  }, [gptId]);

  // Listen for OAuth success/error messages and URL parameters
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'mcp_oauth_success') {
        toast.success("Tool connected successfully!");
        fetchConnections(); // Refresh connections
        setOpen(false); // Close the popover
      } else if (event.data?.type === 'mcp_oauth_error') {
        toast.error("Failed to connect tool");
      }
    };

    // Check for URL parameters indicating OAuth success/error
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mcp_success') === 'true') {
      const connectionId = urlParams.get('connection_id');
      toast.success(`Tool connected successfully! ${connectionId ? `(ID: ${connectionId})` : ''}`);
      fetchConnections();
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else if (urlParams.get('mcp_error') === 'true') {
      const error = urlParams.get('error') || 'Failed to connect tool';
      toast.error(error);
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleToolToggle = (toolSlug: string, enabled: boolean) => {
    if (enabled) {
      setEnabledTools(prev => [...prev, toolSlug]);
    } else {
      setEnabledTools(prev => prev.filter(t => t !== toolSlug));
    }
  };

  const handleConnect = async (toolSlug: string) => {
    try {
      setConnecting(toolSlug);
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
        
        // Redirect to Composio OAuth in same tab
        window.location.href = data.redirect_url;
        
        toast.success(`Redirecting to ${toolSlug} authentication...`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to initiate connection");
      }
    } catch (error) {
      console.error("Error connecting tool:", error);
      toast.error("Failed to connect tool");
    } finally {
      setConnecting(null);
    }
  };

  // Notify parent component of enabled tools
  useEffect(() => {
    onToolsChange(enabledTools);
  }, [enabledTools, onToolsChange]);


  const isConnected = (toolSlug: string) => {
    return activeConnections.includes(toolSlug.toLowerCase());
  };

  const isEnabled = (toolSlug: string) => {
    return enabledTools.includes(toolSlug);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7 rounded-full"
          disabled={disabled}
        >
          <Settings className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Composio Tools</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {enabledTools.length} enabled
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => fetchConnections(true)}
                disabled={refreshing}
              >
                <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="ml-2 text-sm">Loading tools...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {availableTools.map((tool) => (
                <div
                  key={tool.slug}
                  className={`flex items-center justify-between p-3 border rounded-lg ${
                    isConnected(tool.slug) ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={tool.logo}
                      alt={tool.name}
                      className="w-6 h-6 rounded"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/globe.svg";
                      }}
                    />
                    <div>
                      <div className={`font-medium text-sm ${
                        isConnected(tool.slug) ? 'text-green-700' : ''
                      }`}>
                        {tool.name}
                        {isConnected(tool.slug) && (
                          <span className="ml-2 text-xs text-green-600">✓ Connected</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tool.description}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {isConnected(tool.slug) ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <Switch
                          checked={isEnabled(tool.slug)}
                          onCheckedChange={(enabled) => 
                            handleToolToggle(tool.slug, enabled)
                          }
                          disabled={disabled}
                          className="data-[state=checked]:bg-green-500"
                        />
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConnect(tool.slug)}
                        disabled={connecting === tool.slug || disabled}
                        className="text-xs"
                      >
                        {connecting === tool.slug ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <>
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {availableTools.length === 0 && !loading && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No tools available
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
