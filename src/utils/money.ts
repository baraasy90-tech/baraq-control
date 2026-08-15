export const fmtMoney = (n: number | null | undefined): string =>
  (n || 0).toLocaleString("en-US", { maximumFractionDigits: 0 }) + " ر.س";
