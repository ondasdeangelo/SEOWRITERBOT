

  import { PrismaClient } from "@prisma/client";
import { supabase } from "./lib/supabase";

// Check if Supabase URL is missing in non-dev mode
if (!process.env.SUPABASE_URL && process.env.NODE_ENV !== "development") {
  throw new Error(
    "SUPABASE_URL must be set. Did you forget to set up your Supabase connection?"
  );
}

// Prisma singleton for hot reload safety
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const db: PrismaClient =
  global.prisma ??
  new PrismaClient({
    log: ["query", "error", "warn"],
  });

if (process.env.NODE_ENV !== "production") global.prisma = db;

// Export Supabase client separately
export { supabase };

// Optional health check
export async function checkDatabaseConnection() {
  try {
    const count = await db.user.count();
    return true;
  } catch (error) {
    console.error("Database connection error:", error);
    return false;
  }
}
