import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Every serverless instance opens its own pool against a shared Supabase pooler
    // limit — keep each one small so parallel queries queue here instead of
    // exhausting it (EMAXCONNSESSION).
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL, max: 3 }),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
