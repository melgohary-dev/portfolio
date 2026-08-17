import { createHash, randomBytes } from 'node:crypto';
import {
  and,
  asc,
  eq,
  getDatabase,
  isNull,
  type Database,
  organizations,
  organizationMembers,
  passwordResetTokens,
  subscriptions,
  users,
  type MemberRole,
} from '@saas/db';
import { hashPassword } from './password.js';

const RESET_TTL_MS = 30 * 60 * 1000;

/**
 * Thin wrapper over the shared process-wide db singleton (packages/db) so the
 * auth and billing packages share one pg pool instead of each caching their own.
 */
export function getDb(): Database {
  return getDatabase();
}

export async function getUserByEmail(email: string) {
  const [user] = await getDb()
    .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  return user ?? null;
}

export type Membership = {
  organizationId: string;
  role: MemberRole;
  name: string;
  slug: string;
};

export function slugify(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'org';
}

export async function createOrganization(opts: { userId: string; name: string }) {
  const db = getDb();
  const base = slugify(opts.name);
  let slug = base;
  let organization;
  // Pre-checking the slug is only a hint: two concurrent sign-ups can both see
  // the same free slug, so the unique constraint is the real guard. On a
  // unique-violation (23505) we re-roll to `${base}-N` and retry.
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      [organization] = await db
        .insert(organizations)
        .values({ name: opts.name, slug })
        .returning();
      break;
    } catch (err) {
      const isUniqueViolation = (err as { code?: string } | undefined)?.code === '23505';
      if (!isUniqueViolation) {
        throw err;
      }
      slug = `${base}-${attempt + 1}`;
    }
  }
  if (!organization) {
    throw new Error('Failed to create organization');
  }
  await db.insert(organizationMembers).values({
    organizationId: organization.id,
    userId: opts.userId,
    role: 'owner',
  });
  await db
    .insert(subscriptions)
    .values({ tenantId: organization.id, plan: 'free', status: 'active' });
  return organization;
}

export async function getMemberships(userId: string): Promise<Membership[]> {
  const db = getDb();
  const rows = await db
    .select({
      organizationId: organizationMembers.organizationId,
      role: organizationMembers.role,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizations.createdAt));
  return rows;
}

export async function resolveOrganizationId(
  userId: string,
  preferred?: string | null,
): Promise<string | null> {
  const memberships = await getMemberships(userId);
  if (preferred && memberships.some((m) => m.organizationId === preferred)) {
    return preferred;
  }
  return memberships[0]?.organizationId ?? null;
}

export async function listMembers(organizationId: string) {
  const db = getDb();
  return db
    .select({
      userId: organizationMembers.userId,
      role: organizationMembers.role,
      email: users.email,
      name: users.name,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId))
    .orderBy(asc(organizationMembers.createdAt));
}

export async function getSubscription(organizationId: string) {
  const [row] = await getDb()
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.tenantId, organizationId))
    .limit(1);
  return row ?? null;
}


export async function inviteMemberByEmail(opts: {
  organizationId: string;
  email: string;
  role: MemberRole;
}) {
  const db = getDb();
  const email = opts.email.trim().toLowerCase();
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (!user) {
    return { ok: false as const, reason: 'user_not_found' as const };
  }
  const [existing] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, opts.organizationId),
        eq(organizationMembers.userId, user.id),
      ),
    )
    .limit(1);
  if (existing) {
    return { ok: false as const, reason: 'already_member' as const };
  }
  await db.insert(organizationMembers).values({
    organizationId: opts.organizationId,
    userId: user.id,
    role: opts.role,
  });
  return { ok: true as const };
}

export async function createPasswordResetToken(email: string): Promise<{
  token: string;
  name?: string | null;
} | null> {
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1);
  if (!user) {
    return null;
  }
  const token = randomBytes(32).toString('hex');
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + RESET_TTL_MS),
  });
  return { token, name: user.name };
}

export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(and(eq(passwordResetTokens.tokenHash, hashToken(token)), isNull(passwordResetTokens.usedAt)))
    .limit(1);
  if (!row || row.expiresAt.getTime() < Date.now()) {
    return false;
  }
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({ passwordHash }).where(eq(users.id, row.userId));
  await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, row.id));
  return true;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
