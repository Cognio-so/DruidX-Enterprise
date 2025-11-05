'use server';

import { requireAdmin } from "@/data/requireAdmin";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function deleteGptbyId(id: string) {
    const session = await requireAdmin();
    
    if (!session?.user) {
        return {
            success: false,
            message: "Unauthorized"
        };
    }
    
    const currentAdminId = session.user.id;
    
    try {
        // First check if GPT exists and belongs to current admin
        const existingGpt = await prisma.gpt.findFirst({
            where: {
                id,
                userId: currentAdminId,  // Only allow deleting GPTs created by current admin
            },
        });

        if (!existingGpt) {
            return {
                success: false,
                message: "GPT not found or you don't have permission to delete it",
            };
        }

        // Delete by id only (we already verified ownership above)
        await prisma.gpt.delete({
            where: {
                id
            }
        });
        
        revalidatePath("/admin/gpts");
        
        return {
            success: true,
            message: "GPT deleted successfully"
        };   
    } catch (error) {
        console.error("Error deleting GPT:", error);
        return {
            success: false,
            message: "Failed to delete GPT"
        };
    }
}