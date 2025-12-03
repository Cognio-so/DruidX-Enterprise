import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { protectRoute } from "@/lib/arcjet";

export async function POST(request: NextRequest) {
  const protection = await protectRoute(request);
  if (protection) {
    return protection;
  }

  try {
    const { email, name, role, message, token, expiresAt } =
      await request.json();

    if (!email || !name || !role || !token || !expiresAt) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        status: "pending",
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Pending invitation already exists for this email" },
        { status: 400 }
      );
    }

    const invitation = await prisma.invitation.create({
      data: {
        email,
        name,
        role,
        message,
        token,
        expiresAt: new Date(expiresAt),
        status: "pending",
      },
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error("Error creating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
