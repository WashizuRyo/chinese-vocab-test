export const AUTH_COOKIE_NAME = "app_auth";

export function isAuthEnabled(): boolean {
  return !!process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0;
}

export async function computeAuthToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  const data = new TextEncoder().encode(`${pw}::v1`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
