import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Missing DATABASE_URL in .env");

const adapter = new PrismaMariaDb(databaseUrl);

export const prisma = new PrismaClient({ adapter });

export async function initDb() {
  await prisma.$executeRawUnsafe(`SET time_zone = '+07:00'`);
  const rows: any = await prisma.$queryRawUnsafe(`
  SELECT @@session.time_zone AS tz,
         DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') AS now_str
`);
}
