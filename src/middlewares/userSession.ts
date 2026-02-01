// src/middlewares/userSession.ts
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
    // ✅ debug logs (เอาออกได้ตอนขึ้น prod)
    console.log("🔐 requireUserSession called", req.method, req.originalUrl);
    console.log("🌐 origin:", req.headers.origin);
    console.log("🍪 cookies:", (req as any).cookies);
    console.log("📦 headers[x-session-token]:", req.headers["x-session-token"]);

    const token = pickToken(req);

    if (!token) {
      console.log("❌ no session token found");
      clearSessionCookie(res);
      return res.status(401).json({ code: "NO_TOKEN", message: "unauthorized" });
    }

    console.log("🔑 session_token:", token);

    const sess = await prisma.user_sessions.findUnique({
      where: { session_token: token },
      select: { line_user_id: true, expires_at: true },
    });

    console.log("🧾 session from DB:", sess);

    if (!sess?.line_user_id) {
      console.log("❌ invalid session (not found)");
      clearSessionCookie(res);
      return res
        .status(401)
        .json({ code: "INVALID_SESSION", message: "unauthorized" });
    }

    // expires_at เป็น Date อยู่แล้วจาก Prisma ส่วนใหญ่
    // แต่เพื่อกันพลาด แปลงเป็น Date อีกชั้น
    const expiresAt = sess.expires_at ? new Date(sess.expires_at as any) : null;

    if (expiresAt && expiresAt.getTime() < Date.now()) {
      console.log("⏰ session expired:", expiresAt.toISOString());
      clearSessionCookie(res);
      return res
        .status(401)
        .json({ code: "SESSION_EXPIRED", message: "unauthorized" });
    }

    // ✅ bind user ให้ route ถัดไปใช้ได้: req.user.line_user_id
    req.user = { line_user_id: sess.line_user_id };

    console.log(" session OK for user:", sess.line_user_id);

    return next();
  } catch (e) {
    console.error("🔥 requireUserSession error:", e);
    clearSessionCookie(res);
    return res.status(401).json({ code: "AUTH_ERROR", message: "unauthorized" });
  }
}
