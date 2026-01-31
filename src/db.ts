import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL in .env");
}

const adapter = new PrismaMariaDb(databaseUrl);

export const prisma = new PrismaClient({ adapter });
