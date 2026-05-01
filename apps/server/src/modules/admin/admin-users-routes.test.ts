import { UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../utils/prisma.js';
import { signToken } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';

const app = createApp();
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdUserIds: string[] = [];

const createUser = async (overrides: {
  username?: string;
  displayName?: string;
  password?: string;
  role?: UserRole;
  status?: UserStatus;
} = {}) => {
  const username = overrides.username ?? `admin-users-${unique()}`;
  const user = await prisma.user.create({
    data: {
      username,
      displayName: overrides.displayName ?? username,
      passwordHash: await hashPassword(overrides.password ?? 'Password123!'),
      role: overrides.role ?? UserRole.USER,
      status: overrides.status ?? UserStatus.ACTIVE,
    },
  });
  createdUserIds.push(user.id);
  return user;
};

const authHeaderFor = (user: { id: string; role: UserRole; tokenVersion: number }) => {
  return `Bearer ${signToken({ sub: user.id, role: user.role, tokenVersion: user.tokenVersion })}`;
};

beforeEach(() => {
  createdUserIds.length = 0;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: { in: createdUserIds } },
        { targetType: 'User', targetId: { in: createdUserIds } },
      ],
    },
  });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe('admin users route contracts', () => {
  it('lists users with pagination and filters', async () => {
    const admin = await createUser({ role: UserRole.ADMIN, username: `admin-${unique()}` });
    await createUser({ username: `alice-${unique()}`, displayName: 'Alice Docs', role: UserRole.USER });
    await createUser({ username: `disabled-${unique()}`, displayName: 'Disabled User', status: UserStatus.DISABLED });

    const response = await request(app)
      .get('/api/admin/users')
      .query({ page: 1, pageSize: 1, keyword: 'Alice', role: UserRole.USER, status: UserStatus.ACTIVE })
      .set('Authorization', authHeaderFor(admin))
      .expect(200);

    expect(response.body.data).toMatchObject({ page: 1, pageSize: 1, total: 1, totalPages: 1 });
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0]).toMatchObject({ displayName: 'Alice Docs', role: UserRole.USER, status: UserStatus.ACTIVE });
    expect(response.body.data.users).toBeUndefined();
  });

  it('accepts newPassword when resetting passwords', async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    const user = await createUser({ username: `reset-${unique()}`, password: 'OldPassword123!' });

    await request(app)
      .post(`/api/admin/users/${user.id}/reset-password`)
      .set('Authorization', authHeaderFor(admin))
      .send({ newPassword: 'NewPassword123!' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'NewPassword123!' })
      .expect(200);
  });

  it('prevents admins from disabling themselves or the last active admin', async () => {
    const onlyAdmin = await createUser({ role: UserRole.ADMIN });

    const selfResponse = await request(app)
      .patch(`/api/admin/users/${onlyAdmin.id}/status`)
      .set('Authorization', authHeaderFor(onlyAdmin))
      .send({ status: UserStatus.DISABLED })
      .expect(400);

    expect(selfResponse.body.code).toBe('VALIDATION_ERROR');

    const secondAdmin = await createUser({ role: UserRole.ADMIN });
    await prisma.user.update({ where: { id: onlyAdmin.id }, data: { status: UserStatus.DISABLED } });

    const lastAdminResponse = await request(app)
      .patch(`/api/admin/users/${secondAdmin.id}/status`)
      .set('Authorization', authHeaderFor(secondAdmin))
      .send({ status: UserStatus.DISABLED })
      .expect(400);

    expect(lastAdminResponse.body.code).toBe('VALIDATION_ERROR');
  });
});
