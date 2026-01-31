import { Request, Response, NextFunction } from "express";
import { prisma } from "../db";

export async function requireUserSession(req: Request, res: Response, next: NextFunction) {
  const cookieName = process.env.SESSION_COOKIE_NAME || "webchat_session";
  const token = req.cookies?.[cookieName];

  if (!token) return res.status(401).json({ message: "unauthorized" });

  const session = await prisma.user_sessions.findUnique({
    where: { session_token: token }
  });

  if (!session) return res.status(401).json({ message: "unauthorized" });

  if (new Date(session.expires_at).getTime() < Date.now()) {
    return res.status(401).json({ message: "session expired" });
  }

  (req as any).line_user_id = session.line_user_id;
  next();
}
