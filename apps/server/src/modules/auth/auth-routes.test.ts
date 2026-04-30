import { UserRole, UserStatus } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../utils/prisma.js';
import { signToken } from './jwt.js';
import { hashPassword } from './password.js';

const app = createApp();
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const createdUsernames: string[] = [];

const createUser = async (overrides: {
  username?: string;
  password?: string;
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
  tokenVersion?: number;
} = {}) => {
  const username = overrides.username ?? `test-${unique()}`;
  createdUsernames.push(username);

  return prisma.user.create({
    data: {
      username,
      displayName: overrides.displayName ?? username,
      passwordHash: await hashPassword(overrides.password ?? 'Password123!'),
      role: overrides.role ?? UserRole.USER,
      status: overrides.status ?? UserStatus.ACTIVE,
      tokenVersion: overrides.tokenVersion ?? 0,
    },
  });
};

const authHeaderFor = (user: { id: string; role: UserRole; tokenVersion: number }) => {
  return `Bearer ${signToken({ sub: user.id, role: user.role, tokenVersion: user.tokenVersion })}`;
};

beforeEach(() => {
  createdUsernames.length = 0;
});

afterEach(async () => {
  if (createdUsernames.length > 0) {
    const users = await prisma.user.findMany({
      where: { username: { in: createdUsernames } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);

    await prisma.auditLog.deleteMany({
      where: { actorId: { in: userIds } },
    });
    await prisma.auditLog.deleteMany({
      where: { targetType: 'User', targetId: { in: userIds } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
  }
});

describe('auth routes', () => {
  it('logs in with username and password and returns the current user', async () => {
    const user = await createUser({ password: 'Password123!' });

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: user.username, password: 'Password123!' })
      .expect(200);

    expect(loginResponse.body.code).toBe(0);
    expect(loginResponse.body.data.token).toEqual(expect.any(String));
    expect(loginResponse.body.data.user.username).toBe(user.username);
    expect(loginResponse.body.data.user.passwordHash).toBeUndefined();

    const meResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginResponse.body.data.token}`)
      .expect(200);

    expect(meResponse.body.data.user.id).toBe(user.id);
  });

  it('rejects disabled users when using protected routes', async () => {
    const user = await createUser({ status: UserStatus.DISABLED });

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', authHeaderFor(user))
      .expect(403);

    expect(response.body.code).toBe('USER_DISABLED');
  });

  it('invalidates old tokens after changing password', async () => {
    const user = await createUser({ password: 'OldPassword123!' });
    const oldToken = signToken({ sub: user.id, role: user.role, tokenVersion: user.tokenVersion });

    await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${oldToken}`)
      .send({ oldPassword: 'OldPassword123!', newPassword: 'NewPassword123!' })
      .expect(200);

    const oldTokenResponse = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${oldToken}`)
      .expect(401);

    expect(oldTokenResponse.body.code).toBe('TOKEN_REVOKED');
  });
});

describe('admin user routes', () => {
  it('allows admins to create, list, disable, enable, and reset user passwords', async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    const adminAuth = authHeaderFor(admin);
    const newUsername = `created-${unique()}`;
    createdUsernames.push(newUsername);

    const createResponse = await request(app)
      .post('/api/admin/users')
      .set('Authorization', adminAuth)
      .send({
        username: newUsername,
        displayName: 'Created User',
        password: 'CreatedPassword123!',
        role: UserRole.USER,
      })
      .expect(201);

    expect(createResponse.body.data.user.username).toBe(newUsername);
    expect(createResponse.body.data.user.passwordHash).toBeUndefined();

    const createdUserId = createResponse.body.data.user.id;

    const listResponse = await request(app)
      .get('/api/admin/users')
      .set('Authorization', adminAuth)
      .expect(200);

    expect(listResponse.body.data.users.some((user: { username: string }) => user.username === newUsername)).toBe(true);

    await request(app)
      .patch(`/api/admin/users/${createdUserId}/status`)
      .set('Authorization', adminAuth)
      .send({ status: UserStatus.DISABLED })
      .expect(200);

    await request(app)
      .patch(`/api/admin/users/${createdUserId}/status`)
      .set('Authorization', adminAuth)
      .send({ status: UserStatus.ACTIVE })
      .expect(200);

    await request(app)
      .post(`/api/admin/users/${createdUserId}/reset-password`)
      .set('Authorization', adminAuth)
      .send({ password: 'ResetPassword123!' })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({ username: newUsername, password: 'ResetPassword123!' })
      .expect(200);
  });

  it('rejects non-admin users from admin routes', async () => {
    const user = await createUser({ role: UserRole.USER });

    const response = await request(app)
      .get('/api/admin/users')
      .set('Authorization', authHeaderFor(user))
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });
});
