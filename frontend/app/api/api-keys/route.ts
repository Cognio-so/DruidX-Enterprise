import { NextRequest, NextResponse } from "next/server";
import { getAllApiKeysForBackend } from "@/app/admin/settings/action";

export async function GET(request: NextRequest) {
  try {
    // This endpoint is used to get all API keys (decrypted) to send to backend
    // It should only be called from server-side code when opening a GPT
    const apiKeys = await getAllApiKeysForBackend();
    
    return NextResponse.json({ success: true, apiKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

