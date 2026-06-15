import { randomBytes, randomUUID, pbkdf2Sync, timingSafeEqual, createHash } from "node:crypto";
import { cookies } from "next/headers";
import { ensureDatabase } from "./bootstrap-db";
import { getDb } from "./db";
import { toJson } from "./serializers";

export const sessionCookieName = "ktsa_session";
const sessionDays = 14;
const passwordIterations = 120000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";

export type AuthContext = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  tenant: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
};

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, passwordIterations, passwordKeyLength, passwordDigest).toString("hex");
  return `pbkdf2:${passwordIterations}:${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [scheme, iterationsValue, salt, hash] = storedHash.split(":");
  if (scheme !== "pbkdf2" || !iterationsValue || !salt || !hash) return false;
  const iterations = Number(iterationsValue);
  if (!Number.isFinite(iterations)) return false;

  const candidate = pbkdf2Sync(password, salt, iterations, passwordKeyLength, passwordDigest);
  const expected = Buffer.from(hash, "hex");
  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  await ensureDatabase();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + sessionDays * 24 * 60 * 60 * 1000);
  await getDb().authSession.create({
    data: {
      id: randomUUID(),
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function clearSession() {
  await ensureDatabase();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (token) {
    await getDb().authSession.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  cookieStore.delete(sessionCookieName);
}

export async function getCurrentAuth(): Promise<AuthContext | null> {
  await ensureDatabase();
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const session = await getDb().authSession.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { user: { include: { tenant: true } } },
  });

  if (!session || session.expiresAt <= new Date() || session.user.status !== "active") {
    if (session) await getDb().authSession.delete({ where: { id: session.id } }).catch(() => null);
    return null;
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: session.user.role,
      status: session.user.status,
    },
    tenant: {
      id: session.user.tenant.id,
      name: session.user.tenant.name,
      plan: session.user.tenant.plan,
      status: session.user.tenant.status,
    },
  };
}

export async function registerEnterpriseAccount(input: {
  name: string;
  email: string;
  password: string;
  tenantName: string;
}) {
  await ensureDatabase();
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const existing = await db.appUser.findUnique({ where: { email } });
  if (existing) throw new Error("这个邮箱已经注册");

  const tenant = await db.enterpriseTenant.create({
    data: {
      id: randomUUID(),
      name: input.tenantName.trim(),
      plan: "trial",
      status: "active",
    },
  });

  const user = await db.appUser.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      name: input.name.trim(),
      email,
      passwordHash: hashPassword(input.password),
      role: "admin",
      status: "active",
    },
  });

  await db.tenantMember.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      role: "admin",
    },
  });

  await db.auditLog.create({
    data: {
      id: randomUUID(),
      tenantId: tenant.id,
      actor: user.email,
      action: "auth.registered",
      entityType: "AppUser",
      entityId: user.id,
      metadata: toJson({ tenantName: tenant.name, role: user.role }),
    },
  });

  await createSession(user.id);
  return { user, tenant };
}

export function canManageTenant(role?: string | null) {
  return role === "admin";
}

export function canEditTenant(role?: string | null) {
  return role === "admin" || role === "editor";
}
