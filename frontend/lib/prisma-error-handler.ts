import { Prisma } from "@/app/generated/prisma";

/**
 * Checks if an error is a Prisma database connection error (P1001)
 * @param error - The error to check
 * @returns true if it's a database connection error, false otherwise
 */
export function isDatabaseConnectionError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P1001"
  ) {
    return true;
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  if (
    error instanceof Error &&
    (error.message.includes("Can't reach database server") ||
      error.message.includes("P1001"))
  ) {
    return true;
  }
  return false;
}

/**
 * Handles database connection errors by logging and returning a default value
 * @param error - The error that occurred
 * @param defaultValue - The default value to return
 * @returns The default value if it's a connection error, otherwise throws the error
 */
export function handleDatabaseError<T>(error: unknown, defaultValue: T): T {
  if (isDatabaseConnectionError(error)) {
    console.error("Database connection error: Cannot reach database server");
    return defaultValue;
  }
  throw error;
}

