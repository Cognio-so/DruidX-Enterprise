import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectRoute } from "@/lib/arcjet";

export async function GET(request: NextRequest) {
  const protection = await protectRoute(request);
  if (protection) {
    return protection;
  }

  try {
    const { searchParams } = new URL(request.url);
    const connectionRequestId = searchParams.get("connection_request_id");
    const status = searchParams.get("status");
    const connectedAccountId = searchParams.get("connected_account_id");
    const appName = searchParams.get("app_name");
    
    console.log("MCP Callback received:", { connectionRequestId, status, connectedAccountId, appName });
    
    // Get the GPT ID from the state parameter
    const gptId = searchParams.get("state");
    
    // Handle different OAuth response scenarios
    if (status === "success" && connectedAccountId && gptId && appName) {
      try {
        // Save connection to database
        await (prisma as any).composioConnection.upsert({
          where: {
            gptId_appName: {
              gptId,
              appName: appName.toLowerCase(),
            },
          },
          update: {
            connectionId: connectedAccountId,
            status: "active",
            updatedAt: new Date(),
          },
          create: {
            gptId,
            appName: appName.toLowerCase(),
            connectionId: connectedAccountId,
            status: "active",
          },
        });
        
        console.log(`Connection saved for GPT ${gptId} and app ${appName}`);
      } catch (dbError) {
        console.error("Error saving connection to database:", dbError);
        // Continue even if DB save fails
      }
      
      // Redirect back to chat page with success
      const redirectUrl = new URL(`/admin/gpts/${gptId}/chat`, request.url);
      redirectUrl.searchParams.set("mcp_success", "true");
      redirectUrl.searchParams.set("connection_id", connectedAccountId);
      return NextResponse.redirect(redirectUrl);
    } else if (connectionRequestId && gptId && appName) {
      try {
        // Save connection to database
        await (prisma as any).composioConnection.upsert({
          where: {
            gptId_appName: {
              gptId,
              appName: appName.toLowerCase(),
            },
          },
          update: {
            connectionId: connectionRequestId,
            status: "active",
            updatedAt: new Date(),
          },
          create: {
            gptId,
            appName: appName.toLowerCase(),
            connectionId: connectionRequestId,
            status: "active",
          },
        });
        
        console.log(`Connection saved for GPT ${gptId} and app ${appName}`);
      } catch (dbError) {
        console.error("Error saving connection to database:", dbError);
        // Continue even if DB save fails
      }
      
      // Redirect back to chat page with success
      const redirectUrl = new URL(`/admin/gpts/${gptId}/chat`, request.url);
      redirectUrl.searchParams.set("mcp_success", "true");
      redirectUrl.searchParams.set("connection_id", connectionRequestId);
      return NextResponse.redirect(redirectUrl);
    } else {
      // Redirect back to chat page with error
      const redirectUrl = new URL(`/admin/gpts/${gptId}/chat`, request.url);
      redirectUrl.searchParams.set("mcp_error", "true");
      redirectUrl.searchParams.set("error", "No connection details received");
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    console.error("Error handling MCP callback:", error);
    const redirectUrl = new URL("/admin/gpts", request.url);
    redirectUrl.searchParams.set("mcp_error", "true");
    redirectUrl.searchParams.set("error", "Failed to handle callback");
    return NextResponse.redirect(redirectUrl);
  }
}
