import { Router } from "express";
import { prisma } from "../db";
import { requireUserSession } from "../middlewares/userSession";

const router = Router();

router.get("/user", requireUserSession, async (req, res) => {
  const line_user_id = (req as any).line_user_id as string;

  const user = await prisma.line_users.findUnique({
    where: { line_user_id },
    select: {
      line_user_id: true,
      display_name: true,
      picture_url: true,
      last_seen_at: true
    }
  });

  if (!user) return res.status(401).json({ message: "unauthorized" });

  return res.json({ ok: true, user });
});

export default router;
