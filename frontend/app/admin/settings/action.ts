'use server';

import prisma from "@/lib/prisma";
import { requireAdmin } from "@/data/requireAdmin";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { encrypt, decrypt } from "@/lib/encryption";

export async function getUserDetails() {
  try {
    const session = await requireAdmin();
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    return { success: true, user };
  } catch (error) {
    console.error('Error fetching user details:', error);
    return { success: false, error: 'Failed to fetch user details' };
  }
}

export async function updateProfile(formData: FormData) {
  try {
    const session = await requireAdmin();
    
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    if (!name || !email) {
      throw new Error('Name and email are required');
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        email: email,
        id: { not: session.user.id }
      }
    });

    if (existingUser) {
      throw new Error('Email is already taken');
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { name, email }
    });

    revalidatePath('/admin/settings');
    redirect('/admin/settings?success=Profile updated successfully');
    
  } catch (error) {
    console.error('Error updating profile:', error);
    redirect(`/admin/settings?error=${encodeURIComponent(error instanceof Error ? error.message : 'Failed to update profile')}`);
  }
}

export async function getApiKeys() {
  try {
    const session = await requireAdmin();
    
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        keyType: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        // Don't return encryptedValue for security
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return { success: true, apiKeys };
  } catch (error) {
    console.error('Error fetching API keys:', error);
    return { success: false, error: 'Failed to fetch API keys' };
  }
}

export async function addApiKey(formData: FormData) {
  try {
    const session = await requireAdmin();
    
    const keyType = formData.get('keyType') as string;
    const value = formData.get('value') as string;

    if (!keyType || !value) {
      throw new Error('Key type and value are required');
    }

    // Check if API key of this type already exists
    const existing = await prisma.apiKey.findUnique({
      where: { keyType }
    });

    if (existing) {
      throw new Error(`API key of type "${keyType}" already exists. Please update the existing one instead.`);
    }

    // Encrypt the API key value
    const encryptedValue = encrypt(value);

    await prisma.apiKey.create({
      data: {
        keyType,
        encryptedValue,
        createdBy: session.user.id
      }
    });

    revalidatePath('/admin/settings');
    return { success: true, message: 'API key added successfully' };
    
  } catch (error) {
    console.error('Error adding API key:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add API key' };
  }
}

export async function updateApiKey(formData: FormData) {
  try {
    const session = await requireAdmin();
    
    const id = formData.get('id') as string;
    const keyType = formData.get('keyType') as string;
    const value = formData.get('value') as string;

    if (!id || !keyType) {
      throw new Error('ID and key type are required');
    }

    // Check if API key exists
    const existing = await prisma.apiKey.findUnique({
      where: { id }
    });

    if (!existing) {
      throw new Error('API key not found');
    }

    // Prepare update data
    const updateData: {
      keyType: string;
      encryptedValue?: string;
    } = {
      keyType
    };

    // Only update encrypted value if a new value is provided
    if (value && value.trim()) {
      updateData.encryptedValue = encrypt(value);
    }

    await prisma.apiKey.update({
      where: { id },
      data: updateData
    });

    revalidatePath('/admin/settings');
    return { success: true, message: 'API key updated successfully' };
    
  } catch (error) {
    console.error('Error updating API key:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update API key' };
  }
}

export async function deleteApiKey(id: string) {
  try {
    const session = await requireAdmin();
    
    if (!id) {
      throw new Error('ID is required');
    }

    await prisma.apiKey.delete({
      where: { id }
    });

    revalidatePath('/admin/settings');
    return { success: true, message: 'API key deleted successfully' };
    
  } catch (error) {
    console.error('Error deleting API key:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to delete API key' };
  }
}

export async function getAllApiKeysForBackend() {
  try {
    // This function is used to get all API keys (decrypted) to send to backend
    // Only call this from server-side code that sends to backend
    const apiKeys = await prisma.apiKey.findMany({
      select: {
        keyType: true,
        encryptedValue: true
      }
    });

    // Decrypt all API keys
    const decryptedKeys: Record<string, string> = {};
    for (const key of apiKeys) {
      try {
        decryptedKeys[key.keyType] = decrypt(key.encryptedValue);
      } catch (error) {
        console.error(`Failed to decrypt API key ${key.keyType}:`, error);
        // Skip this key if decryption fails
      }
    }

    return decryptedKeys;
  } catch (error) {
    console.error('Error fetching API keys for backend:', error);
    return {};
  }
}