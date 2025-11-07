import "server-only";
import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getGroupDetails(groupId: string) {
  await requireUser();

  const group = await prisma.teamGroup.findUnique({
    where: { id: groupId },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              role: true,
            },
          },
        },
        orderBy: {
          addedAt: "desc",
        },
      },
      gptAssignments: {
        include: {
          gpt: {
            select: {
              id: true,
              name: true,
              description: true,
              image: true,
            },
          },
        },
        orderBy: {
          assignedAt: "desc",
        },
      },
    },
  });

  return group;
}

export type GroupDetails = Awaited<ReturnType<typeof getGroupDetails>>;

