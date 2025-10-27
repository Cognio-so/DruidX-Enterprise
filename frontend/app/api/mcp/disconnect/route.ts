import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gpt_id, connection_id } = body;
    
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
