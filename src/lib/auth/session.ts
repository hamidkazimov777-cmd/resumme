import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "resumee_session";
export const SESSION_TTL_DAYS = 30;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  return { token: session.id, expiresAt };
}

// Validate a session token; returns the user, or null if missing/expired.
// Expired sessions are cleaned up opportunistically.
export async function validateSession(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: token } }).catch(() => {});
    return null;
  }
  return { id: session.user.id, email: session.user.email, name: session.user.name };
}

export async function invalidateSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}
