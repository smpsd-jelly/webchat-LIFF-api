import { Router } from "express";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { prisma } from "../db";
import { randomToken, daysFromNow } from "../utils/session";
import { getCookieOptions } from "../utils/cookie";
import { nowBangkok } from "../utils/bangkokTime";

const router = Router();

const jwks = createRemoteJWKSet(new URL("https://api.line.me/oauth2/v2.1/certs"));

router.post("/line/verify", async (req, res) => {
  const reqId = `${Date.now()}-${Math.random().toString(16).slice(2)}`; // ✅ trace id
  const now = nowBangkok();

  console.log("\n==============================");
  console.log("▶️  /auth/line/verify called", { reqId, at: now.toString?.() ?? now });
  console.log("🌐 origin:", req.headers.origin);
  console.log("🌐 referer:", req.headers.referer);
  console.log("🧩 host:", req.headers.host);
  console.log("🔒 x-forwarded-proto:", req.headers["x-forwarded-proto"]);
  console.log("🍪 req.cookies:", (req as any).cookies);
  console.log("📦 body keys:", Object.keys(req.body || {}));
  console.log("==============================\n");

  const { idToken } = req.body || {};
  if (!idToken) {
    console.log("❌ missing idToken", { reqId });
    return res.status(400).json({ message: "missing idToken" });
  }

  try {
    console.log("🧾 verifying idToken...", { reqId });

    const { payload, protectedHeader } = await jwtVerify(idToken, jwks, {
      issuer: "https://access.line.me",
      audience: process.env.LINE_LOGIN_CHANNEL_ID,
      clockTolerance: 300,
    });

    console.log("✅ LINE verify success", {
      reqId,
      kid: protectedHeader?.kid,
      sub: payload.sub,
      name: payload.name,
      hasPicture: !!payload.picture,
      aud: payload.aud,
      iss: payload.iss,
      exp: payload.exp,
      iat: payload.iat,
    });

    const line_user_id = String(payload.sub);
    const display_name = typeof payload.name === "string" ? payload.name : null;
    const picture_url = typeof payload.picture === "string" ? payload.picture : null;

    console.log("🧑 user parsed", { reqId, line_user_id, display_name, hasPic: !!picture_url });

    console.log("🗄️ upsert line_users...", { reqId });
    await prisma.line_users.upsert({
      where: { line_user_id },
      update: { display_name, picture_url, last_seen_at: now },
      create: { line_user_id, display_name, picture_url, last_seen_at: now, created_at: now },
    });
    console.log("✅ upsert line_users OK", { reqId });

    console.log("🗄️ upsert conversations...", { reqId });
    await prisma.conversations.upsert({
      where: { line_user_id },
      update: { status: "open", last_message_at: now },
      create: { line_user_id, status: "open", last_message_at: now, created_at: now },
    });
    console.log("✅ upsert conversations OK", { reqId });

    const session_token = randomToken(64);
    const expires_at = daysFromNow(Number(process.env.SESSION_TTL_DAYS || 7));

    console.log("🗄️ create user_sessions...", {
      reqId,
      line_user_id,
      session_token_preview: `${session_token.slice(0, 6)}...${session_token.slice(-4)}`,
      expires_at: expires_at.toISOString?.() ?? expires_at,
    });

    await prisma.user_sessions.create({
      data: { line_user_id, session_token, created_at: now, expires_at },
    });

    console.log("✅ create user_sessions OK", { reqId });

    const cookieName = process.env.SESSION_COOKIE_NAME || "session_token";
    const cookieOptions = getCookieOptions(expires_at);

    console.log("🍪 setting cookie...", {
      reqId,
      cookieName,
      value_preview: `${session_token.slice(0, 6)}...${session_token.slice(-4)}`,
      cookieOptions,
    });

    res.cookie(cookieName, session_token, cookieOptions);

    const setCookieHeader = res.getHeader("set-cookie");
    console.log("📤 response set-cookie header:", { reqId, setCookieHeader });

    console.log("✅ /auth/line/verify done", { reqId });
    console.log("==============================\n");

    return res.json({ ok: true, reqId });
  } catch (err: any) {
    console.error("❌ /auth/line/verify error", {
      reqId,
      name: err?.name,
      message: err?.message,
      code: err?.code,
    });
    return res.status(401).json({ message: "invalid idToken", reqId });
  }
});

export default router;
