import { Router } from "express";
import { prisma } from "../db";
import { randomToken, daysFromNow } from "../utils/session";
import { getCookieOptions } from "../utils/cookie";
import { nowBangkok } from "../utils/bangkokTime";

const router = Router();

router.post("/login", async (req, res) => {
  const now = nowBangkok();

  const { line_user_id, display_name, picture_url } = req.body || {};
  if (!line_user_id)
    return res.status(400).json({ message: "missing line_user_id" });

  await prisma.line_users.upsert({
    where: { line_user_id },
    update: { display_name, picture_url, last_seen_at: now },
    create: {
      line_user_id,
      display_name,
      picture_url,
      created_at: now,
      last_seen_at: now,
    },
  });

  await prisma.conversations.upsert({
    where: { line_user_id },
    update: { status: "open", last_message_at: now },
    create: {
      line_user_id,
      status: "open",
      last_message_at: now,
      created_at: now,
    },
  });

  const session_token = randomToken(64);
  const expires_at = daysFromNow(Number(process.env.SESSION_TTL_DAYS || 7));

  await prisma.user_sessions.create({
    data: { line_user_id, session_token, expires_at, created_at: now },
  });

  const cookieName = process.env.SESSION_COOKIE_NAME || "session_token";
  res.cookie(cookieName, session_token, getCookieOptions(expires_at));

  return res.json({ ok: true });
});

router.post("/logout", async (req, res) => {
  const cookieName = process.env.SESSION_COOKIE_NAME || "session_token";
  const token = req.cookies?.[cookieName];

  // ลบ session ใน DB (ถ้ามี token)
  if (token) {
    await prisma.user_sessions.deleteMany({
      where: { session_token: token },
    });
  }

  // ลบ cookie ใน browser
  res.clearCookie(cookieName, getCookieOptions());

  return res.json({ ok: true });
});

export default router;
