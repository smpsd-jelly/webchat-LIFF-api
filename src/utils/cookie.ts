export function getCookieOptions(expires?: Date) {
  return {
    httpOnly: true,
    sameSite: "none" as const, 
    secure: true,             
    path: "/",
    ...(expires ? { expires } : {}),
  };
}
