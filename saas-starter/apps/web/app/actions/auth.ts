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
import { z } from 'zod';

export type AuthActionState = { error?: string; ok?: boolean };

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

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
  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/app',
    });
    // signIn throws NEXT_REDIRECT — this line is unreachable on success.
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
  password: z.string().min(8).max(200),
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
  const existing = await getUserByEmail(email);
  if (existing) {
    return { error: 'EMAIL_EXISTS' };
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const [user] = await getDb()
    .insert(users)
    .values({ email, name: parsed.data.name, passwordHash })
    .returning();
  if (!user) {
    return { error: 'ACCOUNT_CREATE_FAILED' };
  }
  await createOrganization({ userId: user.id, name: parsed.data.orgName });
  try {
    await signIn('credentials', {
      email,
      password: parsed.data.password,
      redirectTo: '/app',
    });
    // signIn throws NEXT_REDIRECT — unreachable on success.
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      // Auto sign-in failed after account creation; tell the user to sign in manually.
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
  const password = z.string().min(8).max(200).safeParse(formData.get('password'));
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
