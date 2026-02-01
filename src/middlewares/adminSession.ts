import { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

export async function requireAdminSession(req: Request, res: Response, next: NextFunction) {
  const cookieName = process.env.ADMIN_SESSION_COOKIE_NAME || "admin_session";
  const token = req.cookies?.[cookieName];
  if (!token) return res.status(401).json({ message: "admin unauthorized" });

  const session = await prisma.admin_sessions.findUnique({
    where: { session_token: token },
    select: { admin_user_id: true, expires_at: true },
  });

  if (!session) return res.status(401).json({ message: "admin unauthorized" });
  if (new Date(session.expires_at).getTime() < Date.now()) {
    await prisma.admin_sessions.deleteMany({ where: { session_token: token } });
    return res.status(401).json({ message: "admin session expired" });
  }

  req.admin = { admin_user_id: session.admin_user_id };
  next();
}
