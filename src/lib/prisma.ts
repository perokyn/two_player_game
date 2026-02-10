// src/lib/prisma.ts
import type { PrismaClient as PrismaClientType } from "@prisma/client";
import { existsSync } from "fs";
import { join } from "path";

let _prisma: PrismaClientType | null = null;

export async function getPrisma(): Promise<PrismaClientType> {
  if (_prisma) return _prisma;

  const runtimePath = join(
    process.cwd(),
    "node_modules",
    "@prisma",
    "client",
    "runtime",
  );
  if (!existsSync(runtimePath)) {
    throw new Error(
      `Prisma runtime not found at ${runtimePath}. Did you run "npx prisma generate"?`,
    );
  }

  // dynamic import the generated client
  const mod: typeof import("@prisma/client") = await import("@prisma/client");
  const PrismaClientCtor: typeof PrismaClientType = mod.PrismaClient;

  // Create the adapter for the database engine.
  // For SQLite we use @prisma/adapter-better-sqlite3
  // (this package must be installed with npm install @prisma/adapter-better-sqlite3 better-sqlite3)
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("Missing DATABASE_URL in environment");
  }

  // dynamic import adapter only when required so other environments aren't affected
  const { PrismaBetterSqlite3 } =
    await import("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });

  _prisma = new PrismaClientCtor({ adapter, log: ["query"] });
  return _prisma;
}

export async function disconnectPrisma() {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

// // src/lib/prisma.ts
// import { PrismaClient } from "@prisma/client/extension";

// declare global {
//   // allow global prisma in dev to avoid multiple instances in HMR
//   // eslint-disable-next-line no-var
//   var prisma: PrismaClient | undefined;
// }

// export const prisma =
//   global.prisma ||
//   new PrismaClient({
//     log: ["query"],
//   });

// if (process.env.NODE_ENV !== "production") global.prisma = prisma;
