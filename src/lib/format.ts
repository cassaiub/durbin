/* Date formatting. Durbin runs on Dhaka time, so every date on the site is
   rendered in Asia/Dhaka regardless of where the build happens. */

const TZ = "Asia/Dhaka";
const LOCALE = "en-GB";

export const fmtDate = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);

export const fmtDateLong = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(d);

export const fmtTime = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).format(d);

export const yearOf = (d: Date): string =>
  new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, year: "numeric" }).format(d);
