import crypto from "crypto";

export function randomToken(len = 64) {
  return crypto.randomBytes(len).toString("hex").slice(0, 128);
}

export function daysFromNow(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
