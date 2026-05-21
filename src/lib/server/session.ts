import { createHmac, timingSafeEqual } from "node:crypto";

const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-session-secret-change-me";

export const SESSION_COOKIE_NAME = "session";

export const SESSION_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

function signUserId(userId: string): string {
  return createHmac("sha256", SESSION_SECRET).update(userId).digest("hex");
}

export function createSessionValue(userId: string): string {
  return `${userId}.${signUserId(userId)}`;
}

export function getUserIdFromSession(value: string): string | null {
  const index = value.lastIndexOf(".");
  if (index <= 0) {
    return null;
  }

  const userId = value.slice(0, index);
  const provided = value.slice(index + 1);
  const expected = signUserId(userId);

  const providedBuffer = Buffer.from(provided, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  if (providedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return timingSafeEqual(providedBuffer, expectedBuffer) ? userId : null;
}
