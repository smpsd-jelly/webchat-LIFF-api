import { Router } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "../db";
import { randomToken, daysFromNow } from "../utils/session";
import { getCookieOptions } from "../utils/cookie";
import { nowBangkok } from "../utils/bangkokTime";

const router = Router();

const jwks = createRemoteJWKSet(
  new URL("https://api.line.me/oauth2/v2.1/certs"),
);

router.post("/line/verify", async (req, res) => {
    console.log("▶️ /auth/line/verify called");
  console.log("body:", req.body);
  const now = nowBangkok();

  const { idToken } = req.body || {};
  if (!idToken) {
    console.log("❌ missing idToken");
    return res.status(400).json({ message: "missing idToken" });
  }

  try {
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: "https://access.line.me",
      audience: process.env.LINE_LOGIN_CHANNEL_ID,
      clockTolerance: 300,
    });

        console.log("✅ LINE verify success:", payload.sub);


    const line_user_id = String(payload.sub); 
    const display_name = typeof payload.name === "string" ? payload.name : null;
    const picture_url =
      typeof payload.picture === "string" ? payload.picture : null;

    await prisma.line_users.upsert({
      where: { line_user_id },
      update: { display_name, picture_url, last_seen_at: now },
      create: {
        line_user_id,
        display_name,
        picture_url,
        last_seen_at: now,
        created_at: now,
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
      data: { line_user_id, session_token, expires_at },
    });

    const cookieName = process.env.SESSION_COOKIE_NAME || "session_token";
    console.log("🍪 set cookie:", cookieName, session_token);

    res.cookie(cookieName, session_token, getCookieOptions(expires_at));

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: "invalid idToken" });
  }
});

export default router;
