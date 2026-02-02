import { Router } from "express";
import { prisma } from "../db";

const router = Router();
function jsonBigInt<T>(data: T): any {
  return JSON.parse(
    JSON.stringify(data, (_k, v) => (typeof v === "bigint" ? v.toString() : v)),
  );
}

async function pushLineMessage(line_user_id: string, text: string) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");

  const r = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: line_user_id,
      messages: [{ type: "text", text }],
    }),
  });

  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`LINE push failed: ${r.status} ${detail}`);
  }
}

/** =========================
 *  GET: list conversations (sidebar)
 *  ========================= */
router.get("/conversations", async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    const rows = await prisma.conversations.findMany({
      where: q
        ? {
            OR: [
              { line_user_id: { contains: q } },
              { user: { display_name: { contains: q } } },
            ],
          }
        : undefined,
      orderBy: [{ last_message_at: "desc" }, { updated_at: "desc" }],
      take: 100,
      select: {
        id: true,
        line_user_id: true,
        status: true,
        last_message_at: true,
        last_message_text: true,
        unread_admin_count: true,
        updated_at: true,
        user: {
          select: { display_name: true, picture_url: true, last_seen_at: true },
        },
      },
    });

    return res.json({ conversations: jsonBigInt(rows) });
  } catch (e: any) {
    return res.status(500).json({ message: String(e?.message || e) });
  }
});

/** =========================
 *  GET: messages in conversation
 *  ========================= */
router.get("/conversations/:id/messages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const after = typeof req.query.after === "string" ? req.query.after : null;

    const where: any = { conversation_id: BigInt(id) };
    if (after) {
      const d = new Date(after);
      if (!Number.isNaN(d.getTime())) where.created_at = { gt: d };
    }

    const rows = await prisma.messages.findMany({
      where,
      orderBy: { created_at: "asc" },
      take: 200,
      select: {
        id: true,
        sender_type: true,
        message_type: true, 
        text: true,
        status: true, 
        created_at: true,
      },
    });

    // reset unread_admin_count เมื่อเปิดอ่าน
    await prisma.conversations.update({
      where: { id: BigInt(id) },
      data: { unread_admin_count: 0 },
    });

    return res.json({ messages: jsonBigInt(rows) });
  } catch (e: any) {
    return res.status(500).json({ message: String(e?.message || e) });
  }
});

/** =========================
 *  POST: admin send message to user
 *  ========================= */
router.post("/conversations/:id/messages", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const text = String(req.body?.text || "").trim();
    if (!text) return res.status(400).json({ message: "missing text" });

    const conv = await prisma.conversations.findUnique({
      where: { id: BigInt(id) },
      select: { id: true, line_user_id: true },
    });
    if (!conv)
      return res.status(404).json({ message: "conversation not found" });

    const now = new Date();

    // 1) insert queued
    const msg = await prisma.messages.create({
      data: {
        conversation_id: conv.id,
        sender_type: "admin",
        message_type: "text",
        text,
        status: "queued",
        created_at: now,
      },
      select: { id: true },
    });

    try {
      // 2) push to LINE
      await pushLineMessage(conv.line_user_id, text);

      // 3) mark sent + update conversation last
      await prisma.messages.update({
        where: { id: msg.id },
        data: { status: "sent" },
      });

      await prisma.conversations.update({
        where: { id: conv.id },
        data: {
          last_message_at: now,
          last_message_text: text,
          updated_at: now,
        },
      });

      return res.json({ ok: true });
    } catch (e: any) {
      await prisma.messages.update({
        where: { id: msg.id },
        data: { status: "failed" },
      });
      return res
        .status(500)
        .json({ message: "send failed", detail: String(e?.message || e) });
    }
  } catch (e: any) {
    return res.status(500).json({ message: String(e?.message || e) });
  }
});

export default router;
