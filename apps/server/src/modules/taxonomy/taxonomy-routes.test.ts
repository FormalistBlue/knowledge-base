import { AuditAction, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../utils/prisma.js';
import { signToken } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';

const app = createApp();
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdTagIds: string[] = [];

const createUser = async (role: UserRole = UserRole.USER) => {
  const user = await prisma.user.create({
    data: {
      username: `taxonomy-${unique()}`,
      displayName: 'Taxonomy Test User',
      passwordHash: await hashPassword('Password123!'),
      role,
    },
  });
  createdUserIds.push(user.id);
  return user;
};

const authHeaderFor = (user: { id: string; role: UserRole; tokenVersion: number }) => {
  return `Bearer ${signToken({ sub: user.id, role: user.role, tokenVersion: user.tokenVersion })}`;
};

const createCategory = async (name: string, parentId?: string | null) => {
  const category = await prisma.category.create({
    data: {
      name,
      parentId: parentId ?? null,
      activeKey: `${parentId ?? '__ROOT__'}:${name.trim().toLowerCase()}`,
      sortOrder: 0,
    },
  });
  createdCategoryIds.push(category.id);
  return category;
};

const createTag = async (name: string, createdById?: string) => {
  const tag = await prisma.tag.create({
    data: {
      name,
      normalizedName: name.trim().toLowerCase(),
      createdById,
    },
  });
  createdTagIds.push(tag.id);
  return tag;
};

beforeEach(() => {
  createdUserIds.length = 0;
  createdCategoryIds.length = 0;
  createdTagIds.length = 0;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: { in: createdUserIds } },
        { targetId: { in: [...createdCategoryIds, ...createdTagIds] } },
      ],
    },
  });
  await prisma.knowledgeTag.deleteMany({ where: { tagId: { in: createdTagIds } } });
  await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });

  for (const categoryId of [...createdCategoryIds].reverse()) {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  }

  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe('category routes', () => {
  it('allows admins to create, list, update, and delete a category tree', async () => {
    const admin = await createUser(UserRole.ADMIN);
    const adminAuth = authHeaderFor(admin);

    const parentResponse = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', adminAuth)
      .send({ name: `Parent ${unique()}`, sortOrder: 10 })
      .expect(201);

    const parent = parentResponse.body.data.category;
    createdCategoryIds.push(parent.id);

    const childResponse = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', adminAuth)
      .send({ name: `Child ${unique()}`, parentId: parent.id, sortOrder: 20 })
      .expect(201);

    const child = childResponse.body.data.category;
    createdCategoryIds.push(child.id);

    const treeResponse = await request(app).get('/api/categories').set('Authorization', adminAuth).expect(200);
    const treeParent = treeResponse.body.data.categories.find((category: { id: string }) => category.id === parent.id);

    expect(treeParent.children).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: child.id, parentId: parent.id })]),
    );

    const updateResponse = await request(app)
      .put(`/api/admin/categories/${child.id}`)
      .set('Authorization', adminAuth)
      .send({ name: 'Updated Child', parentId: null, sortOrder: 5 })
      .expect(200);

    expect(updateResponse.body.data.category).toMatchObject({ id: child.id, name: 'Updated Child', parentId: null });

    await request(app).delete(`/api/admin/categories/${child.id}`).set('Authorization', adminAuth).expect(200);
    await request(app).delete(`/api/admin/categories/${parent.id}`).set('Authorization', adminAuth).expect(200);

    const auditLogs = await prisma.auditLog.findMany({
      where: { actorId: admin.id, targetId: { in: [parent.id, child.id] } },
    });
    expect(auditLogs.some((log) => log.action === AuditAction.DELETE_CATEGORY)).toBe(true);
  });

  it('rejects category deletion when child categories exist and rejects circular parent updates', async () => {
    const admin = await createUser(UserRole.ADMIN);
    const adminAuth = authHeaderFor(admin);
    const parent = await createCategory(`Parent ${unique()}`);
    const child = await createCategory(`Child ${unique()}`, parent.id);

    const deleteResponse = await request(app)
      .delete(`/api/admin/categories/${parent.id}`)
      .set('Authorization', adminAuth)
      .expect(409);

    expect(deleteResponse.body.code).toBe('CONFLICT');

    const circularResponse = await request(app)
      .put(`/api/admin/categories/${parent.id}`)
      .set('Authorization', adminAuth)
      .send({ name: parent.name, parentId: child.id, sortOrder: 0 })
      .expect(400);

    expect(circularResponse.body.code).toBe('VALIDATION_ERROR');
  });

  it('allows recreating a root category after soft deletion', async () => {
    const admin = await createUser(UserRole.ADMIN);
    const adminAuth = authHeaderFor(admin);
    const name = `Reusable ${unique()}`;

    const firstResponse = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', adminAuth)
      .send({ name })
      .expect(201);
    const firstCategory = firstResponse.body.data.category;
    createdCategoryIds.push(firstCategory.id);

    await request(app).delete(`/api/admin/categories/${firstCategory.id}`).set('Authorization', adminAuth).expect(200);

    const secondResponse = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', adminAuth)
      .send({ name })
      .expect(201);
    const secondCategory = secondResponse.body.data.category;
    createdCategoryIds.push(secondCategory.id);

    expect(secondCategory.id).not.toBe(firstCategory.id);
  });

  it('rejects non-admin users from category management', async () => {
    const user = await createUser(UserRole.USER);

    const response = await request(app)
      .post('/api/admin/categories')
      .set('Authorization', authHeaderFor(user))
      .send({ name: `Forbidden ${unique()}` })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });
});

describe('tag routes', () => {
  it('allows users to create deduplicated tags and admins to update and delete tags', async () => {
    const user = await createUser(UserRole.USER);
    const admin = await createUser(UserRole.ADMIN);
    const userAuth = authHeaderFor(user);
    const adminAuth = authHeaderFor(admin);

    const tagName = `P6${unique().replace(/[^a-z0-9]/gi, '').slice(0, 16)}`;
    const createResponse = await request(app)
      .post('/api/tags')
      .set('Authorization', userAuth)
      .send({ name: `  ${tagName}  ` })
      .expect(201);

    const tag = createResponse.body.data.tag;
    createdTagIds.push(tag.id);
    expect(tag).toMatchObject({ name: tagName, normalizedName: tagName.toLowerCase(), createdById: user.id });

    const duplicateResponse = await request(app)
      .post('/api/tags')
      .set('Authorization', userAuth)
      .send({ name: tagName.toLowerCase() })
      .expect(200);

    expect(duplicateResponse.body.data.tag.id).toBe(tag.id);

    const listResponse = await request(app).get('/api/tags').set('Authorization', userAuth).expect(200);
    expect(listResponse.body.data.tags.some((item: { id: string }) => item.id === tag.id)).toBe(true);

    const updateResponse = await request(app)
      .put(`/api/admin/tags/${tag.id}`)
      .set('Authorization', adminAuth)
      .send({ name: 'Vue3' })
      .expect(200);

    expect(updateResponse.body.data.tag).toMatchObject({ id: tag.id, name: 'Vue3', normalizedName: 'vue3' });

    await request(app).delete(`/api/admin/tags/${tag.id}`).set('Authorization', adminAuth).expect(200);

    const auditLogs = await prisma.auditLog.findMany({ where: { actorId: admin.id, targetId: tag.id } });
    expect(auditLogs.some((log) => log.action === AuditAction.DELETE_TAG)).toBe(true);
  });

  it('rejects non-admin users from tag maintenance', async () => {
    const user = await createUser(UserRole.USER);
    const tag = await createTag(`tag-${unique()}`, user.id);

    const response = await request(app)
      .put(`/api/admin/tags/${tag.id}`)
      .set('Authorization', authHeaderFor(user))
      .send({ name: 'Nope' })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });
});
