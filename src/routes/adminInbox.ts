import { Router } from "express";
import { prisma } from "../db";
import { requireAdminSession } from "../middlewares/adminSession";
import { pushToUser } from "../services/lineApi";

const router = Router();

router.get("/admin/conversations", requireAdminSession, async (_req, res) => {
  const items = await prisma.conversations.findMany({
    orderBy: { last_message_at: "desc" },
    take: 100,
    select: {
      id: true,
      line_user_id: true,
      status: true,
      last_message_at: true,
      created_at: true,
    },
  });
  res.json({ items });
});

router.get(
  "/admin/conversations/:id/messages",
  requireAdminSession,
  async (req, res) => {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!idParam) return res.status(400).json({ message: "missing id" });
    const conversation_id = BigInt(idParam);

    const items = await prisma.messages.findMany({
      where: { conversation_id },
      orderBy: { created_at: "asc" },
      take: 300,
      select: { id: true, sender_type: true, text: true, created_at: true },
    });

    res.json({ items });
  },
);

router.post(
  "/admin/conversations/:id/reply",
  requireAdminSession,
  async (req, res) => {
    const idParam = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!idParam) return res.status(400).json({ message: "missing id" });

    const conversation_id = BigInt(idParam);
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "missing text" });

    const conv = await prisma.conversations.findUnique({
      where: { id: conversation_id },
      select: { id: true, line_user_id: true },
    });
    if (!conv)
      return res.status(404).json({ message: "conversation not found" });

    const now = new Date();

    await prisma.messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: "admin",
        text,
        created_at: now,
      },
    });

    await pushToUser(conv.line_user_id, text);

    await prisma.conversations.update({
      where: { id: conv.id },
      data: { last_message_at: now, status: "open" },
    });

    res.json({ ok: true });
  },
);

export default router;
