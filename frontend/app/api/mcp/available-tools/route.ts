import { NextRequest, NextResponse } from "next/server";

// Revalidate every 5 minutes - tools don't change frequently
export const revalidate = 300;

export async function GET(request: NextRequest) {
  try {
    const backendUrl = process.env.BACKEND_URL || "http://localhost:8000";
    
    // Use Next.js fetch with caching for better performance
    const response = await fetch(`${backendUrl}/api/mcp/available-tools`, {
      next: { 
        revalidate: 300, // Cache for 5 minutes
        tags: ['composio-tools'] // Tag for on-demand revalidation
      },
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error("Error fetching available tools:", error);
    return NextResponse.json(
      { error: "Failed to fetch available tools" },
      { status: 500 }
    );
  }
}
