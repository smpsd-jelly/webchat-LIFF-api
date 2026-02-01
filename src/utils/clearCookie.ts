import type { Response } from "express";

export function clearSessionCookie(res: Response) {
  res.clearCookie("session_token", {
    path: "/",
    sameSite: "none",
    secure: true,
  });
}
