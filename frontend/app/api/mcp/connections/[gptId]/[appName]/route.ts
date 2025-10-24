import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ gptId: string; appName: string }> }
) {
  try {
    const { gptId, appName } = await params;
    
    if (!gptId || !appName) {
      return NextResponse.json(
        { error: "gptId and appName are required" },
        { status: 400 }
      );
    }

    // First, try to remove from database
    try {
      const deletedConnection = await (prisma as any).composioConnection.deleteMany({
        where: {
          gptId,
          appName: appName.toLowerCase(),
        },
      });

      if (deletedConnection.count > 0) {
        console.log(`Deleted connection for GPT ${gptId} and app ${appName} from database`);
      }
    } catch (dbError) {
      console.error("Error deleting from database:", dbError);
      // Continue to try Composio API
    }

    // Also try to remove from Composio backend
    try {
      const response = await fetch(`${backendUrl}/api/mcp/connections/${gptId}/${appName}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        console.warn(`Failed to delete from Composio API: ${response.status}`);
      } else {
        console.log(`Deleted connection for GPT ${gptId} and app ${appName} from Composio`);
      }
    } catch (apiError) {
      console.error("Error deleting from Composio API:", apiError);
      // Continue even if API deletion fails
    }

    return NextResponse.json({
      success: true,
      message: `Connection for ${appName} has been removed`,
    });
  } catch (error) {
    console.error("Error deleting MCP connection:", error);
    return NextResponse.json(
      { error: "Failed to delete connection" },
      { status: 500 }
    );
  }
}
