import "server-only";
import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getUserAssignedGpts(userId: string) {
  await requireUser();

  // Fetch both individual assignments and group-assigned GPTs in parallel
  const [individualAssignments, groupAssignments] = await Promise.all([
    // Individual assignments
    prisma.assignGpt.findMany({
      where: {
        userId: userId
      },
      include: {
        gpt: {
          select: {
            id: true,
            name: true,
            description: true,
            model: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        assignedAt: "desc"
      }
    }),
    // GPTs assigned through groups
    prisma.groupGptAssignment.findMany({
      where: {
        group: {
          members: {
            some: {
              userId: userId
            }
          }
        }
      },
      include: {
        gpt: {
          select: {
            id: true,
            name: true,
            description: true,
            model: true,
            image: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        assignedAt: "desc"
      }
    })
  ]);

  // Combine and deduplicate by GPT ID
  const gptMap = new Map<string, typeof individualAssignments[0]>();
  
  // Add individual assignments first
  individualAssignments.forEach(assignment => {
    gptMap.set(assignment.gpt.id, assignment);
  });
  
  // Add group assignments (will overwrite if duplicate, keeping individual assignment)
  groupAssignments.forEach(groupAssignment => {
    if (!gptMap.has(groupAssignment.gpt.id)) {
      // Create a compatible structure for group assignments
      gptMap.set(groupAssignment.gpt.id, {
        id: groupAssignment.id,
        userId: userId,
        gptId: groupAssignment.gptId,
        assignedBy: groupAssignment.assignedBy,
        assignedAt: groupAssignment.assignedAt,
        gpt: groupAssignment.gpt
      } as typeof individualAssignments[0]);
    }
  });
  
  // Convert map to array and sort by assignedAt
  return Array.from(gptMap.values()).sort((a, b) => 
    new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
  );
}

export type UserAssignedGpt = Awaited<ReturnType<typeof getUserAssignedGpts>>[0];
