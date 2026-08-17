'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@saas/auth';
import {
  createOrganization,
  inviteMemberByEmail,
  resolveOrganizationId,
} from '@saas/auth/db';

export type OrgActionState = { error?: string; ok?: boolean };

export async function createOrganizationAction(
  _prevState: OrgActionState | undefined,
  formData: FormData,
): Promise<OrgActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'NOT_SIGNED_IN' };
  }
  const name = z.string().min(1).max(80).safeParse(formData.get('name'));
  if (!name.success) {
    return { error: 'ENTER_ORG_NAME' };
  }
  await createOrganization({ userId: session.user.id, name: name.data });
  revalidatePath('/app');
  return { ok: true };
}

export async function inviteMemberAction(
  _prevState: OrgActionState | undefined,
  formData: FormData,
): Promise<OrgActionState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: 'NOT_SIGNED_IN' };
  }
  const orgId = await resolveOrganizationId(session.user.id, session.currentOrgId);
  if (!orgId) {
    return { error: 'NO_ORGANIZATION' };
  }
  const email = z.string().email().safeParse(formData.get('email'));
  const role = z.enum(['member', 'admin']).safeParse(formData.get('role'));
  if (!email.success) {
    return { error: 'ENTER_VALID_EMAIL_ADDRESS' };
  }
  const result = await inviteMemberByEmail({
    organizationId: orgId,
    email: email.data,
    role: role.success ? role.data : 'member',
  });
  if (result.ok) {
    revalidatePath('/app/settings');
    return { ok: true };
  }
  return {
    error: result.reason === 'user_not_found' ? 'INVITE_USER_NOT_FOUND' : 'INVITE_ALREADY_MEMBER',
  };
}
