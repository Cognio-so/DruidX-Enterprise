import { NextRequest, NextResponse } from "next/server";
import { protectRoute } from "@/lib/arcjet";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  const protection = await protectRoute(request);
  if (protection) {
    return protection;
  }

  try {
    const body = await request.json();
    const { sessionId, roomName } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/voice/disconnect`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sessionId, roomName }),
      }
    );

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Voice disconnection error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect voice" },
      { status: 500 }
    );
  }
}
