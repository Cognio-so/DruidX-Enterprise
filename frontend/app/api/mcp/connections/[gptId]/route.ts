import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/data/requireUser";
import { protectRoute } from "@/lib/arcjet";

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gptId: string }> }
) {
  const protection = await protectRoute(request);
  if (protection) {
    return protection;
  }

  try {
    const session = await requireUser();
    const currentUserId = session.user.id;
    const userRole = session.user.role;
    
    const { gptId } = await params;
    
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

    // First, try to get connections from database
    try {
      const dbConnections = await (prisma as any).composioConnection.findMany({
        where: {
          gptId,
          status: "active",
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (dbConnections.length > 0) {
        // Verify connections are still active in Composio
        try {
          // Fetch GPT to get userId
          const gpt = await prisma.gpt.findUnique({
            where: { id: gptId },
            select: { userId: true },
          });
          
          const user_id = gpt?.userId;
          const url = user_id 
            ? `${backendUrl}/api/mcp/connections/${gptId}?user_id=${user_id}`
            : `${backendUrl}/api/mcp/connections/${gptId}`;
          
          const response = await fetch(url);
          if (response.ok) {
            const composioData = await response.json();
            const activeComposioConnections = composioData.connections || [];
            
            // Get active connection IDs from Composio
            const activeConnectionIds = activeComposioConnections.map((conn: any) => conn.id);
            
            // Filter database connections to only include those still active in Composio
            const validDbConnections = dbConnections.filter((dbConn: any) => 
              activeConnectionIds.includes(dbConn.connectionId)
            );
            
            // Remove stale connections from database
            const staleConnections = dbConnections.filter((dbConn: any) => 
              !activeConnectionIds.includes(dbConn.connectionId)
            );
            
            if (staleConnections.length > 0) {
              console.log(`Cleaning up ${staleConnections.length} stale connections from database`);
              await (prisma as any).composioConnection.deleteMany({
                where: {
                  gptId,
                  connectionId: {
                    in: staleConnections.map((conn: any) => conn.connectionId)
                  }
                }
              });
            }
            
            // Transform valid database connections to match expected format
            const connections = validDbConnections.map((conn: any) => ({
              id: conn.connectionId,
              connection_id: conn.connectionId,
              app_name: conn.appName,
              status: conn.status,
              created_at: conn.createdAt.toISOString(),
              updated_at: conn.updatedAt.toISOString(),
            }));

            return NextResponse.json({
              connections,
              source: "database_verified",
            });
          }
        } catch (verifyError) {
          console.error("Error verifying connections with Composio:", verifyError);
          // If verification fails, still return database connections but mark as potentially stale
        }
        
        // Fallback: return database connections without verification
        const connections = dbConnections.map((conn: any) => ({
          id: conn.connectionId,
          connection_id: conn.connectionId,
          app_name: conn.appName,
          status: conn.status,
          created_at: conn.createdAt.toISOString(),
          updated_at: conn.updatedAt.toISOString(),
        }));

        return NextResponse.json({
          connections,
          source: "database",
        });
      }
    } catch (dbError) {
      console.error("Error fetching from database:", dbError);
      // Continue to fallback to Composio API
    }

    // Fallback to Composio API
    try {
      // Fetch GPT to get userId
      const gpt = await prisma.gpt.findUnique({
        where: { id: gptId },
        select: { userId: true },
      });
      
      const user_id = gpt?.userId;
      const url = user_id 
        ? `${backendUrl}/api/mcp/connections/${gptId}?user_id=${user_id}`
        : `${backendUrl}/api/mcp/connections/${gptId}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Backend responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Optionally sync to database for future faster access
      if (data.connections && data.connections.length > 0) {
        // Async sync to database (don't wait for it)
        fetch("/api/mcp/connections/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ gptId }),
        }).catch(err => console.error("Background sync failed:", err));
      }
      
      return NextResponse.json({
        ...data,
        source: "composio",
      });
    } catch (apiError) {
      console.error("Error fetching from Composio API:", apiError);
      
      // Return empty connections if both database and API fail
      return NextResponse.json({
        connections: [],
        source: "fallback",
        error: "Failed to fetch connections from both database and API",
      });
    }
  } catch (error) {
    console.error("Error fetching MCP connections:", error);
    return NextResponse.json(
      { error: "Failed to fetch connections" },
      { status: 500 }
    );
  }
}
