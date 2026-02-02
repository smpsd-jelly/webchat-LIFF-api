import type { Request, Response, NextFunction } from "express";
import { prisma } from "../db";
import { clearSessionCookie } from "../utils/clearCookie";

function pickToken(req: Request): string | null {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session_token";

  const cookieToken = (req as any).cookies?.[cookieName];
  if (typeof cookieToken === "string" && cookieToken.trim()) return cookieToken;

  const headerToken = req.headers["x-session-token"];
  if (typeof headerToken === "string" && headerToken.trim()) return headerToken;

  return null;
}

export async function requireUserSession(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
 
    const token = pickToken(req);

    if (!token) {
      console.log("❌ no session token found");
      clearSessionCookie(res);
      return res.status(401).json({ code: "NO_TOKEN", message: "unauthorized" });
    }

    const sess = await prisma.user_sessions.findUnique({
      where: { session_token: token },
      select: { line_user_id: true, expires_at: true },
    });

    if (!sess?.line_user_id) {
      console.log("❌ invalid session (not found)");
      clearSessionCookie(res);
      return res
        .status(401)
        .json({ code: "INVALID_SESSION", message: "unauthorized" });
    }

    const expiresAt = sess.expires_at ? new Date(sess.expires_at as any) : null;

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      console.log("⏰ session expired:", expiresAt.toISOString());
      clearSessionCookie(res);
      return res
        .status(401)
        .json({ code: "SESSION_EXPIRED", message: "unauthorized" });
    }

    req.user = { line_user_id: sess.line_user_id };

    console.log(" session OK for user:", sess.line_user_id);

    return next();
  } catch (e) {
    console.error("🔥 requireUserSession error:", e);
    clearSessionCookie(res);
    return res.status(401).json({ code: "AUTH_ERROR", message: "unauthorized" });
  }
}
