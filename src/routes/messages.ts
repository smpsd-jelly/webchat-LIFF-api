import { Router } from "express";
import { prisma } from "../db";
import { requireUserSession } from "../middlewares/userSession";
import { notifyAdmin } from "../services/lineApi";

const router = Router();

router.post("/messages/send", requireUserSession, async (req, res) => {
  const msg = String(req.body?.text || "").trim();
  if (!msg) return res.status(400).json({ message: "missing text" });

  const line_user_id = req.user!.line_user_id;
  const now = new Date();

  const conv = await prisma.conversations.upsert({
    where: { line_user_id },
    update: {
      status: "open",
      last_message_at: now,
      last_message_text: msg,
      unread_admin_count: { increment: 1 },
    },
    create: {
      line_user_id,
      status: "open",
      last_message_at: now,
      last_message_text: msg,
      unread_admin_count: 1,
      unread_user_count: 0,
      created_at: now,
    },
  });

  await prisma.messages.create({
    data: {
      conversation_id: conv.id,
      sender_type: "user",
      text: msg,
      created_at: now,
      status: "received", 
    },
  });

  await notifyAdmin(line_user_id, msg);

  return res.json({ ok: true });
});

export default router;
