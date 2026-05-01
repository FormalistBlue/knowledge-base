import { AuditAction, AttachmentStatus, AttachmentUsageType, KnowledgeStatus, UserRole, UserStatus } from '@prisma/client';
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
const createdKnowledgeIds: string[] = [];
const createdAttachmentIds: string[] = [];
const createdAuditLogIds: string[] = [];

const createUser = async (overrides: { role?: UserRole; status?: UserStatus; username?: string } = {}) => {
  const username = overrides.username ?? `stats-${unique()}`;
  const user = await prisma.user.create({
    data: {
      username,
      displayName: username,
      passwordHash: await hashPassword('Password123!'),
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

const createCategory = async () => {
  const name = `Stats Category ${unique()}`;
  const category = await prisma.category.create({ data: { name, activeKey: `root:${name}`, sortOrder: 0 } });
  createdCategoryIds.push(category.id);
  return category;
};

const createKnowledge = async (authorId: string, categoryId: string, overrides: { status?: KnowledgeStatus; viewCount?: number } = {}) => {
  const knowledge = await prisma.knowledgeItem.create({
    data: {
      title: `Stats Knowledge ${unique()}`,
      summary: '统计测试摘要',
      content: '统计测试内容',
      status: overrides.status ?? KnowledgeStatus.PUBLISHED,
      categoryId,
      authorId,
      viewCount: overrides.viewCount ?? 0,
      publishedAt: new Date(),
    },
  });
  createdKnowledgeIds.push(knowledge.id);
  return knowledge;
};

beforeEach(() => {
  createdUserIds.length = 0;
  createdCategoryIds.length = 0;
  createdKnowledgeIds.length = 0;
  createdAttachmentIds.length = 0;
  createdAuditLogIds.length = 0;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany({ where: { OR: [{ id: { in: createdAuditLogIds } }, { actorId: { in: createdUserIds } }] } });
  await prisma.attachment.deleteMany({ where: { id: { in: createdAttachmentIds } } });
  await prisma.knowledgeItem.deleteMany({ where: { id: { in: createdKnowledgeIds } } });
  await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe('admin stats and audit routes', () => {
  it('returns admin overview stats and rejects normal users', async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    const user = await createUser();
    const disabledUser = await createUser({ status: UserStatus.DISABLED });
    const category = await createCategory();
    const published = await createKnowledge(user.id, category.id, { viewCount: 7 });
    await createKnowledge(user.id, category.id, { status: KnowledgeStatus.DRAFT, viewCount: 3 });
    const attachment = await prisma.attachment.create({
      data: {
        knowledgeId: published.id,
        uploaderId: user.id,
        usageType: AttachmentUsageType.ATTACHMENT,
        status: AttachmentStatus.BOUND,
        originalName: 'guide.pdf',
        storedName: 'guide.pdf',
        relativePath: '2026/guide.pdf',
        fileSize: 128,
        mimeType: 'application/pdf',
        extension: '.pdf',
        boundAt: new Date(),
      },
    });
    createdAttachmentIds.push(attachment.id);

    await request(app).get('/api/admin/stats/overview').set('Authorization', authHeaderFor(user)).expect(403);

    const response = await request(app).get('/api/admin/stats/overview').set('Authorization', authHeaderFor(admin)).expect(200);

    expect(response.body.data.overview.knowledge.total).toBeGreaterThanOrEqual(2);
    expect(response.body.data.overview.knowledge.published).toBeGreaterThanOrEqual(1);
    expect(response.body.data.overview.users.total).toBeGreaterThanOrEqual(3);
    expect(response.body.data.overview.users.disabled).toBeGreaterThanOrEqual(1);
    expect(response.body.data.overview.totalViews).toBeGreaterThanOrEqual(10);
    expect(response.body.data.overview.attachments.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.overview.attachments.totalSize).toBeGreaterThanOrEqual(128);
  });

  it('lists audit logs with filters and safe actor fields', async () => {
    const admin = await createUser({ role: UserRole.ADMIN });
    const target = await createUser({ username: `audit-target-${unique()}` });
    const auditLog = await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: AuditAction.CREATE_USER,
        targetType: 'User',
        targetId: target.id,
        summary: `创建用户 ${target.username}`,
        metadata: { username: target.username },
      },
    });
    createdAuditLogIds.push(auditLog.id);

    const response = await request(app)
      .get('/api/admin/audit-logs')
      .query({ page: 1, pageSize: 5, action: AuditAction.CREATE_USER, keyword: target.username })
      .set('Authorization', authHeaderFor(admin))
      .expect(200);

    expect(response.body.data.total).toBeGreaterThanOrEqual(1);
    expect(response.body.data.items[0]).toMatchObject({ action: AuditAction.CREATE_USER, targetType: 'User' });
    expect(response.body.data.items[0].actor).toMatchObject({ id: admin.id, username: admin.username, displayName: admin.displayName });
    expect(response.body.data.items[0].actor.passwordHash).toBeUndefined();
  });
});
