"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import {
  teamMemberUpdateSchema,
  teamMemberInviteSchema,
  assignGptSchema,
  teamGroupSchema,
  assignGptToGroupSchema,
  addMembersToGroupSchema,
} from "@/lib/zodSchema";
import { requireAdmin } from "@/data/requireAdmin";
import { getAdminGpts } from "@/data/get-admin-gpts";
import { getUserAssignedGpts } from "@/data/get-user-assigned-gpts";
import { getTeamMembers } from "@/data/get-team-members";
import { getGroupDetails } from "@/data/get-group-details";

export async function createInvitation(data: {
  email: string;
  name: string;
  role: string;
  message?: string;
}) {
  await requireAdmin();
  const validatedFields = teamMemberInviteSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { email, name, role, message } = validatedFields.data;

  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      status: "pending",
    },
  });

  if (existingInvitation) {
    throw new Error("Pending invitation already exists for this email");
  }

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); 

  const invitation = await prisma.invitation.create({
    data: {
      email,
      name,
      role,
      message: message || undefined,
      token,
      expiresAt,
      status: "pending",
    },
  });

  const invitationToken = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

  try {
    const emailResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/teams/invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          name,
          role,
          message,
          invitationToken,
        }),
      }
    );

    if (!emailResponse.ok) {
      throw new Error("Failed to send invitation email");
    }
  } catch (error) {
    await prisma.invitation.delete({
      where: { id: invitation.id },
    });
    throw new Error("Failed to send invitation email");
  }

  revalidatePath("/admin/teams");
  return { success: true, invitation };
}

export async function updateUser(
  userId: string,
  data: {
    name: string;
    email: string;
    role: string;
  }
) {
  const validatedFields = teamMemberUpdateSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { name, email, role } = validatedFields.data;

  const existingUser = await prisma.user.findFirst({
    where: {
      email,
      id: { not: userId },
    },
  });

  if (existingUser) {
    throw new Error("Email is already taken by another user");
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      email,
      role,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/teams");
  return { success: true, user: updatedUser };
}

export async function deleteUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function getInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation has expired");
  }

  return invitation;
}

export async function acceptInvitation(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    throw new Error("Invitation not found");
  }

  if (invitation.status === "accepted") {
    throw new Error("Invitation already accepted");
  }

  if (new Date() > invitation.expiresAt) {
    throw new Error("Invitation has expired");
  }

  await prisma.invitation.update({
    where: { token },
    data: {
      status: "accepted",
      acceptedAt: new Date(),
    },
  });

  return { success: true };
}

export async function assignGptsToUser(data: {
  userId: string;
  gptIds: string[];
}) {
  const session = await requireAdmin();
  
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }
  
  const currentAdminId = session.user.id;
  
  const validatedFields = assignGptSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { userId, gptIds } = validatedFields.data;

  // Verify all GPTs belong to current admin
  if (gptIds.length > 0) {
    const adminGpts = await prisma.gpt.findMany({
      where: {
        id: { in: gptIds },
        userId: currentAdminId
      },
      select: { id: true }
    });

    const adminGptIds = adminGpts.map(gpt => gpt.id);
    const invalidGptIds = gptIds.filter(id => !adminGptIds.includes(id));

    if (invalidGptIds.length > 0) {
      return {
        success: false,
        error: `You can only assign GPTs you created. Invalid GPT IDs: ${invalidGptIds.join(', ')}`
      };
    }
  }

  // First, remove all existing assignments for this user (only those assigned by current admin)
  await prisma.assignGpt.deleteMany({
    where: {
      userId,
      assignedBy: currentAdminId
    }
  });

  // Then create new assignments
  if (gptIds.length > 0) {
    await prisma.assignGpt.createMany({
      data: gptIds.map(gptId => ({
        userId,
        gptId,
        assignedBy: currentAdminId  // Use current admin's ID
      }))
    });
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function getAdminGptsForAssignment() {
  await requireAdmin();
  return await getAdminGpts();
}

export async function getUserAssignedGptsForAssignment(userId: string) {
  await requireAdmin();
  return await getUserAssignedGpts(userId);
}

export async function createTeamGroup(data: {
  name: string;
  description?: string;
  image?: string;
}) {
  const session = await requireAdmin();
  
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const validatedFields = teamGroupSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { name, description, image } = validatedFields.data;

  const group = await prisma.teamGroup.create({
    data: {
      name,
      description: description || undefined,
      image: image || undefined,
      createdBy: session.user.id,
    },
  });

  revalidatePath("/admin/teams");
  return { success: true, group };
}

export async function updateTeamGroup(
  groupId: string,
  data: {
    name: string;
    description?: string;
    image?: string;
  }
) {
  await requireAdmin();

  const validatedFields = teamGroupSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { name, description, image } = validatedFields.data;

  const group = await prisma.teamGroup.update({
    where: { id: groupId },
    data: {
      name,
      description: description || undefined,
      image: image || undefined,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/admin/teams");
  return { success: true, group };
}

export async function deleteTeamGroup(groupId: string) {
  await requireAdmin();

  const group = await prisma.teamGroup.findUnique({
    where: { id: groupId },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  await prisma.teamGroup.delete({
    where: { id: groupId },
  });

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function addMembersToGroup(data: {
  groupId: string;
  userIds: string[];
}) {
  const session = await requireAdmin();
  
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const validatedFields = addMembersToGroupSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { groupId, userIds } = validatedFields.data;

  const group = await prisma.teamGroup.findUnique({
    where: { id: groupId },
    include: {
      gptAssignments: {
        select: {
          gptId: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  const existingMembers = await prisma.groupMember.findMany({
    where: {
      groupId,
      userId: { in: userIds },
    },
    select: {
      userId: true,
    },
  });

  const existingUserIds = existingMembers.map((m) => m.userId);
  const newUserIds = userIds.filter((id) => !existingUserIds.includes(id));

  if (newUserIds.length > 0) {
    await prisma.groupMember.createMany({
      data: newUserIds.map((userId) => ({
        groupId,
        userId,
        addedBy: session.user.id,
      })),
    });

    if (group.gptAssignments.length > 0) {
      const gptIds = group.gptAssignments.map((ga) => ga.gptId);
      
      for (const userId of newUserIds) {
        const assignmentsToCreate = gptIds.map((gptId) => ({
          userId,
          gptId,
          assignedBy: session.user.id,
        }));

        await prisma.assignGpt.createMany({
          data: assignmentsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function removeMemberFromGroup(groupId: string, userId: string) {
  const session = await requireAdmin();
  
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const group = await prisma.teamGroup.findUnique({
    where: { id: groupId },
    include: {
      gptAssignments: {
        select: {
          gptId: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  await prisma.groupMember.deleteMany({
    where: {
      groupId,
      userId,
    },
  });

  if (group.gptAssignments.length > 0) {
    const gptIds = group.gptAssignments.map((ga) => ga.gptId);
    
    await prisma.assignGpt.deleteMany({
      where: {
        userId,
        gptId: { in: gptIds },
        assignedBy: session.user.id,
      },
    });
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function assignGptsToGroup(data: {
  groupId: string;
  gptIds: string[];
}) {
  const session = await requireAdmin();
  
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const currentAdminId = session.user.id;

  const validatedFields = assignGptToGroupSchema.safeParse(data);

  if (!validatedFields.success) {
    throw new Error("Validation failed: " + validatedFields.error.message);
  }

  const { groupId, gptIds } = validatedFields.data;

  const group = await prisma.teamGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  if (gptIds.length > 0) {
    const adminGpts = await prisma.gpt.findMany({
      where: {
        id: { in: gptIds },
        userId: currentAdminId,
      },
      select: { id: true },
    });

    const adminGptIds = adminGpts.map((gpt) => gpt.id);
    const invalidGptIds = gptIds.filter((id) => !adminGptIds.includes(id));

    if (invalidGptIds.length > 0) {
      return {
        success: false,
        error: `You can only assign GPTs you created. Invalid GPT IDs: ${invalidGptIds.join(", ")}`,
      };
    }
  }

  const existingAssignments = await prisma.groupGptAssignment.findMany({
    where: {
      groupId,
      gptId: { in: gptIds },
    },
    select: {
      gptId: true,
    },
  });

  const existingGptIds = existingAssignments.map((a) => a.gptId);
  const newGptIds = gptIds.filter((id) => !existingGptIds.includes(id));

  if (newGptIds.length > 0) {
    await prisma.groupGptAssignment.createMany({
      data: newGptIds.map((gptId) => ({
        groupId,
        gptId,
        assignedBy: currentAdminId,
      })),
    });

    if (group.members.length > 0) {
      const userIds = group.members.map((m) => m.userId);

      for (const gptId of newGptIds) {
        const assignmentsToCreate = userIds.map((userId) => ({
          userId,
          gptId,
          assignedBy: currentAdminId,
        }));

        await prisma.assignGpt.createMany({
          data: assignmentsToCreate,
          skipDuplicates: true,
        });
      }
    }
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function removeGptFromGroup(groupId: string, gptId: string) {
  const session = await requireAdmin();
  
  if (!session?.user) {
    return { success: false, error: "Unauthorized" };
  }

  const group = await prisma.teamGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!group) {
    throw new Error("Group not found");
  }

  await prisma.groupGptAssignment.deleteMany({
    where: {
      groupId,
      gptId,
    },
  });

  if (group.members.length > 0) {
    const userIds = group.members.map((m) => m.userId);

    await prisma.assignGpt.deleteMany({
      where: {
        userId: { in: userIds },
        gptId,
        assignedBy: session.user.id,
      },
    });
  }

  revalidatePath("/admin/teams");
  return { success: true };
}

export async function getTeamMembersForClient() {
  await requireAdmin();
  return await getTeamMembers();
}

export async function getGroupDetailsForClient(groupId: string) {
  await requireAdmin();
  return await getGroupDetails(groupId);
}

