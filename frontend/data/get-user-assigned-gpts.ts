import prisma from "@/lib/prisma";
import { requireUser } from "./requireUser";

export async function getUserAssignedGpts(userId: string) {
  await requireUser();

  const data = await prisma.assignGpt.findMany({
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
  });
  
  return data;
}

export type UserAssignedGpt = Awaited<ReturnType<typeof getUserAssignedGpts>>[0];
