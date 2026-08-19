'use server';

import { AuthError } from 'next-auth';
import { hashPassword, signIn, signOut } from '@saas/auth';
import {
  createOrganization,
  createPasswordResetToken,
  getDb,
  getUserByEmail,
  resetPasswordWithToken,
} from '@saas/auth/db';
import { renderResetPasswordEmail, sendEmail } from '@saas/email';
import { users } from '@saas/db/schema';
import { eq } from '@saas/db';
import { z } from 'zod';

export type AuthActionState = { error?: string; ok?: boolean };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_SWEEP_INTERVAL = 60_000;
let lastSweep = Date.now();

function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  if (now - lastSweep > RATE_LIMIT_SWEEP_INTERVAL) {
    for (const [k, entry] of rateLimitMap) {
      if (now > entry.resetAt) rateLimitMap.delete(k);
    }
    lastSweep = now;
  }
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxAttempts) return false;
  entry.count += 1;
  return true;
}

export async function loginAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { error: 'INVALID_INPUT' };
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!checkRateLimit(`login:${email}`, 5, 60_000)) {
    return { error: 'RATE_LIMITED' };
  }

  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirectTo: '/app',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'INVALID_CREDENTIALS' };
    }
    throw error;
  }
}

const registerSchema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  orgName: z.string().min(1).max(80),
});

export async function registerAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    orgName: formData.get('orgName'),
  });
  if (!parsed.success) {
    return { error: 'INVALID_INPUT' };
  }

  const email = parsed.data.email.trim().toLowerCase();
  if (!checkRateLimit(`register:${email}`, 3, 300_000)) {
    return { error: 'RATE_LIMITED' };
  }

  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: 'EMAIL_EXISTS' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  let user;
  try {
    const [created] = await getDb()
      .insert(users)
      .values({ email, name: parsed.data.name, passwordHash })
      .returning();
    user = created;
  } catch (err) {
    if ((err as { code?: string })?.code === '23505') {
      return { error: 'EMAIL_EXISTS' };
    }
    throw err;
  }

  if (!user) {
    return { error: 'ACCOUNT_CREATE_FAILED' };
  }

  try {
    await createOrganization({ userId: user.id, name: parsed.data.orgName });
  } catch (orgError) {
    await getDb().delete(users).where(eq(users.id, user.id)).catch(() => {});
    return { error: 'ACCOUNT_CREATE_FAILED' };
  }

  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirectTo: '/app',
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'AUTO_SIGNIN_FAILED' };
    }
    throw error;
  }
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const email = z.string().email().safeParse(formData.get('email'));
  if (!email.success) {
    return { error: 'ENTER_VALID_EMAIL' };
  }
  if (!checkRateLimit(`reset:${email.data}`, 3, 300_000)) {
    return { error: 'RATE_LIMITED' };
  }
  const result = await createPasswordResetToken(email.data);
  if (result) {
    const base = process.env.AUTH_URL ?? 'http://localhost:3000';
    const resetUrl = `${base}/reset-password?token=${result.token}`;
    const { text, html } = renderResetPasswordEmail({
      name: result.name ?? undefined,
      resetUrl,
    });
    await sendEmail({ to: email.data, subject: 'Reset your password', text, html });
  }
  return { ok: true };
}

export async function resetPasswordAction(
  _prevState: AuthActionState | undefined,
  formData: FormData,
): Promise<AuthActionState> {
  const token = z.string().min(1).safeParse(formData.get('token'));
  const password = z
    .string()
    .min(8)
    .max(200)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .safeParse(formData.get('password'));
  if (!token.success || !password.success) {
    return { error: 'RESET_INVALID' };
  }
  const ok = await resetPasswordWithToken(token.data, password.data);
  if (!ok) {
    return { error: 'RESET_EXPIRED' };
  }
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: '/login' });
}
