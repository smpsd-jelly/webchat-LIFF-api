import { Router } from "express";
import { prisma } from "../db";
import { randomToken, daysFromNow } from "../utils/session";

const router = Router();

router.post("/login", async (req, res) => {
  const { line_user_id, display_name, picture_url } = req.body || {};
  if (!line_user_id) return res.status(400).json({ message: "missing line_user_id" });

  await prisma.line_users.upsert({
    where: { line_user_id },
    update: { display_name, picture_url, last_seen_at: new Date() },
    create: { line_user_id, display_name, picture_url, last_seen_at: new Date() },
  });

  await prisma.conversations.upsert({
    where: { line_user_id },
    update: { status: "open", last_message_at: new Date() },
    create: { line_user_id, status: "open", last_message_at: new Date() },
  });

  const session_token = randomToken(64);
  const expires_at = daysFromNow(Number(process.env.SESSION_TTL_DAYS || 7));

  await prisma.user_sessions.create({
    data: { line_user_id, session_token, expires_at }
  });

  const cookieName = process.env.SESSION_COOKIE_NAME || "webchat_session";
  res.cookie(cookieName, session_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    expires: expires_at,
  });

  return res.json({ ok: true });
});

export default router;
