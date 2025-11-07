import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getTeamGroups() {
  await requireUser();

  const groups = await prisma.teamGroup.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      _count: {
        select: {
          members: true,
          gptAssignments: true,
        },
      },
    },
  });

  return groups;
}

export type TeamGroup = Awaited<ReturnType<typeof getTeamGroups>>[0];

