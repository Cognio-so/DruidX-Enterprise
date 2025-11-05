import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireUser } from "@/data/requireUser";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireUser();
    const currentUserId = session.user.id;
    const userRole = session.user.role;

    const { id } = await params;

    const gpt = await prisma.gpt.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        model: true,
        instruction: true,
        webBrowser: true,
        hybridRag: true,
        image: true,
        knowledgeBase: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!gpt) {
      return NextResponse.json({ error: "GPT not found" }, { status: 404 });
    }

    // If user is admin, only allow access to GPTs they created
    if (userRole === "admin" && gpt.userId !== currentUserId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // For regular users, check if GPT is assigned to them or they created it
    if (userRole === "user" && gpt.userId !== currentUserId) {
      const isAssigned = await prisma.assignGpt.findUnique({
        where: {
          userId_gptId: {
            userId: currentUserId,
            gptId: id
          }
        }
      });

      if (!isAssigned) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    return NextResponse.json(gpt);
  } catch (error) {
    console.error("Error fetching GPT:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
