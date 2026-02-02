import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../db";

const router = Router();

function verifyLineSignature(
  rawBody: string,
  channelSecret: string,
  signature: string,
) {
  const hash = crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
  return hash === signature;
}

router.post("/webhook", async (req, res) => {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const signature = String(req.headers["x-line-signature"] || "");
  const rawBody = (req as any).rawBody as string;

  if (!secret || !signature)
    return res.status(400).json({ message: "missing secret/signature" });
  if (!rawBody) return res.status(400).json({ message: "missing rawBody" });

  if (!verifyLineSignature(rawBody, secret, signature)) {
    return res.status(401).json({ message: "invalid signature" });
  }

  const payload = JSON.parse(rawBody);
  const events = payload?.events || [];
  const now = new Date();

  for (const ev of events) {
    if (ev.type !== "message") continue;

    const line_user_id = ev?.source?.userId;
    if (!line_user_id) continue;

    const msgType =
      ev?.message?.type === "text"
        ? "text"
        : ev?.message?.type === "image"
          ? "image"
          : ev?.message?.type === "sticker"
            ? "sticker"
            : ev?.message?.type === "file"
              ? "file"
              : "system";

    const text =
      ev?.message?.type === "text"
        ? String(ev?.message?.text || "")
        : `[${msgType}]`;

    // 1) upsert user
    await prisma.line_users.upsert({
      where: { line_user_id },
      update: { last_seen_at: now },
      create: {
        line_user_id,
        display_name: null,
        picture_url: null,
        created_at: now,
        last_seen_at: now,
      },
    });

    // 2) upsert conversation + unread_admin_count++
    const conv = await prisma.conversations.upsert({
      where: { line_user_id },
      update: {
        status: "open",
        last_message_at: now,
        last_message_text: text,
        unread_admin_count: { increment: 1 },
        updated_at: now,
      },
      create: {
        line_user_id,
        status: "open",
        last_message_at: now,
        last_message_text: text,
        unread_admin_count: 1,
        unread_user_count: 0,
        created_at: now,
        updated_at: now,
      },
    });

    // 3) insert message
    await prisma.messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: "user",
        text,
        created_at: now,
        raw_event: ev,
      },
    });
  }

  return res.json({ ok: true });
});

export default router;
