import { NextRequest, NextResponse } from "next/server";
import { getAllApiKeysForBackend } from "@/app/admin/settings/action";
import { protectRoute } from "@/lib/arcjet";

export async function GET(request: NextRequest) {
  try {
    const protection = await protectRoute(request);
    if (protection) {
      return protection;
    }

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

