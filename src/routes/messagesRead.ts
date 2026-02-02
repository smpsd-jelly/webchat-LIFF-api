import { Router } from "express";
import { prisma } from "../db";
import { requireUserSession } from "../middlewares/userSession";

const router = Router();

function jsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();

  if (Array.isArray(value)) {
    return value.map((v) => jsonSafe(v));
  }

  if (value && typeof value === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      o[k] = jsonSafe(v);
    }
    return o;
  }

  return value;
}

router.get("/messages/history", requireUserSession, async (req, res) => {
  const line_user_id = (req as any).user?.line_user_id as string | undefined;
  if (!line_user_id) return res.status(401).json({ message: "unauthorized" });

  const after = typeof req.query.after === "string" ? req.query.after : null;

  const conv = await prisma.conversations.findUnique({
    where: { line_user_id },
    select: { id: true },
  });
  if (!conv) return res.json({ messages: [] });

  const where: any = { conversation_id: conv.id };
  if (after) {
    const d = new Date(after);
    if (!Number.isNaN(d.getTime())) where.created_at = { gt: d };
  }

  const rows = await prisma.messages.findMany({
    where,
    orderBy: { created_at: "asc" },
    take: 50,
    select: {
      id: true,
      sender_type: true,
      text: true,
      created_at: true,
    },
  });

  return res.json({
    messages: jsonSafe(
      rows.map((r) => ({
        ...r,
        created_at:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at),
      })),
    ),
  });
});

export default router;
