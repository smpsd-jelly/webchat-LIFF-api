import type { CookieOptions } from "express";

export function getCookieOptions(expires?: Date): CookieOptions {
  const isHttps =
    process.env.COOKIE_SECURE === "true" ||
    process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isHttps,                        
    sameSite: isHttps ? "none" : "lax",     
    path: "/",
    ...(expires ? { expires } : {}),
  };
}
