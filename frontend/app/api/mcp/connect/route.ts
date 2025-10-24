import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gpt_id, app_name, redirect_url } = body;
    
    if (!gpt_id || !app_name) {
      return NextResponse.json(
        { error: "gpt_id and app_name are required" },
        { status: 400 }
      );
    }
    
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    const response = await fetch(`${backendUrl}/api/mcp/connect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        gpt_id,
        app_name,
        redirect_url: redirect_url || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/mcp/callback?state=${gpt_id}&app_name=${app_name}`
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error initiating MCP connection:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection" },
      { status: 500 }
    );
  }
}
