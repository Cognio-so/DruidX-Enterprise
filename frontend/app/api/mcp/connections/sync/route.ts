import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const { gptId } = await request.json();
    
    if (!gptId) {
      return NextResponse.json(
        { error: "gptId is required" },
        { status: 400 }
      );
    }

    // Fetch connections from Composio backend
    const response = await fetch(`${backendUrl}/api/mcp/connections/${gptId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    const connections = data.connections || [];

    // Sync connections to database
    const syncResults = [];
    for (const connection of connections) {
      try {
        const result = await (prisma as any).composioConnection.upsert({
          where: {
            gptId_appName: {
              gptId,
              appName: connection.app_name?.toLowerCase() || "",
            },
          },
          update: {
            connectionId: connection.connection_id || connection.id,
            status: connection.status || "active",
            updatedAt: new Date(),
          },
          create: {
            gptId,
            appName: connection.app_name?.toLowerCase() || "",
            connectionId: connection.connection_id || connection.id,
            status: connection.status || "active",
          },
        });
        syncResults.push(result);
      } catch (error) {
        console.error(`Error syncing connection for ${connection.app_name}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      synced: syncResults.length,
      total: connections.length,
      connections: syncResults,
    });
  } catch (error: any) {
    console.error("Error syncing MCP connections:", error);
    return NextResponse.json(
      { error: error.message || "Failed to sync connections" },
      { status: 500 }
    );
  }
}
