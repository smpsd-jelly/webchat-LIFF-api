import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL!;
const adapter = new PrismaMariaDb(databaseUrl);

export const prisma = new PrismaClient({ adapter });
