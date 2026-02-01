//sync user ที่ส่งจาก LINE app เข้า DB
import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../db";

const router = Router();

router.post(
  "/webhook/line",
  (req, res, next) => {
    next();
  },
  async (req: any, res) => {
    try {
      const channelSecret = process.env.LINE_CHANNEL_SECRET;
      if (!channelSecret) return res.status(500).send("Missing LINE_CHANNEL_SECRET");

      const signature = req.get("x-line-signature") || "";
      const rawBody: Buffer = req.rawBody;

      const hmac = crypto.createHmac("sha256", channelSecret).update(rawBody).digest("base64");
      if (hmac !== signature) return res.status(401).send("Bad signature");

      const body = req.body;

      const events = Array.isArray(body?.events) ? body.events : [];
      const now = new Date();

      for (const ev of events) {
        if (ev.type === "message" && ev.message?.type === "text") {
          const line_user_id = String(ev.source?.userId || "");
          const text = String(ev.message?.text || "").trim();
          if (!line_user_id || !text) continue;

          await prisma.line_users.upsert({
            where: { line_user_id },
            update: { last_seen_at: now },
            create: { line_user_id, created_at: now, last_seen_at: now },
          });

          const conv = await prisma.conversations.upsert({
            where: { line_user_id },
            update: { status: "open", last_message_at: now },
            create: { line_user_id, status: "open", last_message_at: now, created_at: now },
          });

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

        if (ev.type === "follow") {
          const line_user_id = String(ev.source?.userId || "");
          if (!line_user_id) continue;
          await prisma.line_users.upsert({
            where: { line_user_id },
            update: { last_seen_at: now },
            create: { line_user_id, created_at: now, last_seen_at: now },
          });
        }
      }

      res.status(200).json({ ok: true });
    } catch (e) {
      console.error("webhook error:", e);
      res.status(500).json({ ok: false });
    }
  }
);

export default router;
