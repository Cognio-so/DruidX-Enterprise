import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, approved, feedback } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "Approved status is required" },
        { status: 400 }
      );
    }

    const backendResponse = await fetch(
      `${BACKEND_URL}/api/sessions/${sessionId}/deepresearch/approval`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          approved,
          feedback: feedback || "",
        }),
      }
    );

    if (!backendResponse.ok) {
      const error = await backendResponse.json().catch(() => ({
        error: "Failed to submit approval",
      }));
      return NextResponse.json(error, {
        status: backendResponse.status,
      });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Deep research approval error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

