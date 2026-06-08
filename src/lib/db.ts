import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createClient() {
  // DATABASE_URL is "file:./dev.db" — strip the "file:" prefix and resolve from project root
  const dbUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const dbRelPath = dbUrl.replace(/^file:/, "");
  const dbPath = path.resolve(process.cwd(), dbRelPath);
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter } as any);
}

export const prisma = globalForPrisma.prisma ?? createClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
