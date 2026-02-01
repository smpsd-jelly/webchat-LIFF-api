export function nowBangkok(): string {
  return toBangkokISO(new Date());
}

export function toBangkokISO(input: Date | string | number): string {
  const d = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);

  return parts.replace(" ", "T") + "+07:00"; 
}
