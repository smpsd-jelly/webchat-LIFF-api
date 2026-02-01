import { Router } from "express";

const router = Router();

router.get("/info", async (_req, res) => {
  try {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN; // Messaging API token
    if (!token) {
      return res.status(500).json({ message: "Missing LINE_CHANNEL_ACCESS_TOKEN" });
    }

    const r = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(r.status).json({ message: "LINE bot info failed", detail: text });
    }

    const data = await r.json();
    return res.json({ oa: data });
  } catch (e: any) {
    return res.status(500).json({ message: String(e?.message || e) });
  }
});

export default router;
