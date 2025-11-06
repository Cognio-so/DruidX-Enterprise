import prisma from "@/lib/prisma";
import { requireAdmin } from "./requireAdmin";

export async function getAdminGpts() {
  const session = await requireAdmin();
  
  // Get current admin's user ID
  const currentAdminId = session.user.id;

  const data = await prisma.gpt.findMany({
    where: {
      userId: currentAdminId,  // Filter by current admin's user ID
      user: {
        role: "admin"
      }
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      description: true,
      model: true,
      image: true,
      webBrowser: true,
      hybridRag: true,
      imageEnabled: true,
      videoEnabled: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true
        }
      }
    },
  });
  return data;
}

export type AdminGpt = Awaited<ReturnType<typeof getAdminGpts>>[0];
