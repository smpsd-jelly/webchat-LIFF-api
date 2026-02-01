import { prisma } from "../db";

async function linePost(path: string, body: any) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");

  const r = await fetch(`https://api.line.me${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`LINE API error ${r.status}: ${t}`);
  }
}

export async function pushToUser(toUserId: string, text: string) {
  await linePost("/v2/bot/message/push", {
    to: toUserId,
    messages: [{ type: "text", text }],
  });
}

export async function notifyAdmin(fromUserId: string, text: string) {
  const to = (process.env.ADMIN_NOTIFY_TO || "").trim();
  const adminUrl = (process.env.ADMIN_DASHBOARD_URL || "").trim();
  if (!to) return;

  const u = await prisma.line_users.findUnique({
    where: { line_user_id: fromUserId },
    select: { display_name: true },
  });

  const displayName = (u?.display_name || "").trim();

  const who = displayName ? displayName : `ผู้ใช้ (${fromUserId.slice(0, 8)}...)`;

  const msg =
    `ข้อความใหม่จาก: ${who}\n` +
    `${text}` +
    (adminUrl ? `\n\nลิงค์ตอบกลับ: ${adminUrl}` : "");

  await linePost("/v2/bot/message/push", {
    to,
    messages: [{ type: "text", text: msg }],
  });
}
