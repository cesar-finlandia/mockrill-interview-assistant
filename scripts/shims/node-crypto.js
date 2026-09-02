// Browser stand-in for the handful of node:crypto helpers the chassis transport imports.
// The chassis is read-only, so the substitution happens at resolve time (see
// browserNodeShims in scripts/vite-dev-api.ts) rather than in its source.
export function randomUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
export default { randomUUID };
