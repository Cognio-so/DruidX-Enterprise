import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/data/requireUser";
import { protectRoute } from "@/lib/arcjet";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  const protection = await protectRoute(request);
  if (protection) {
    return protection;
  }

  try {
    const session = await requireUser();
    const currentUserId = session.user.id;
    const userRole = session.user.role;
    
    const { gptId } = await request.json();
    
    if (!gptId) {
      return NextResponse.json(
        { error: "gptId is required" },
        { status: 400 }
      );
    }

    // Verify GPT belongs to current user (for admins) or is assigned to them (for regular users)
    const gpt = await prisma.gpt.findUnique({
      where: { id: gptId },
      select: { userId: true }
    });

    if (!gpt) {
      return NextResponse.json(
        { error: "GPT not found" },
        { status: 404 }
      );
    }

    // If user is admin, only allow access to GPTs they created
    if (userRole === "admin" && gpt.userId !== currentUserId) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // For regular users, check if GPT is assigned to them or they created it
    if (userRole === "user" && gpt.userId !== currentUserId) {
      const isAssigned = await prisma.assignGpt.findUnique({
        where: {
          userId_gptId: {
            userId: currentUserId,
            gptId: gptId
          }
        }
      });

      if (!isAssigned) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }
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
