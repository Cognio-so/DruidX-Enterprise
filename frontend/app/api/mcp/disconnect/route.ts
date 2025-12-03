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
    
    const body = await request.json();
    const { gpt_id, connection_id } = body;
    
    if (!gpt_id) {
      return NextResponse.json(
        { error: "gpt_id is required" },
        { status: 400 }
      );
    }

    // Verify GPT belongs to current user (for admins) or is assigned to them (for regular users)
    const gpt = await prisma.gpt.findUnique({
      where: { id: gpt_id },
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
            gptId: gpt_id
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
    
    // First, delete from Composio API
    const response = await fetch(`${backendUrl}/api/mcp/disconnect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Always try to delete from database, even if Composio deletion failed
    // This handles cases where the connection was already deleted from Composio but still exists in database
    if (gpt_id && connection_id) {
      try {
        const deleteResult = await (prisma as any).composioConnection.deleteMany({
          where: {
            gptId: gpt_id,
            connectionId: connection_id,
          },
        });
        
        if (deleteResult.count > 0) {
          console.log(`Deleted connection ${connection_id} from database for GPT ${gpt_id}`);
        } else {
          console.log(`Connection ${connection_id} not found in database for GPT ${gpt_id}`);
        }
      } catch (dbError) {
        console.error("Error deleting from database:", dbError);
        // Don't fail the request if database deletion fails
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in disconnect API route:", error);
    return NextResponse.json(
      { error: "Failed to disconnect tool" },
      { status: 500 }
    );
  }
}
