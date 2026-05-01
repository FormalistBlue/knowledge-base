import { AuditAction, KnowledgeStatus, UserRole } from '@prisma/client';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../utils/prisma.js';
import { signToken } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { makeActiveCategoryKey } from '../taxonomy/taxonomy-presenter.js';

const app = createApp();
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdTagIds: string[] = [];
const createdKnowledgeIds: string[] = [];

const createUser = async (role: UserRole = UserRole.USER) => {
  const user = await prisma.user.create({
    data: {
      username: `knowledge-${unique()}`,
      displayName: 'Knowledge Test User',
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

const createCategory = async (name = `Knowledge Category ${unique()}`, parentId: string | null = null) => {
  const category = await prisma.category.create({
    data: {
      name,
      parentId,
      activeKey: makeActiveCategoryKey(parentId, name),
      sortOrder: 0,
    },
  });
  createdCategoryIds.push(category.id);
  return category;
};

const createTag = async (name = `knowledge-tag-${unique()}`) => {
  const tag = await prisma.tag.create({
    data: {
      name,
      normalizedName: name.trim().toLowerCase(),
    },
  });
  createdTagIds.push(tag.id);
  return tag;
};

const createKnowledge = async ({
  authorId,
  categoryId,
  status = KnowledgeStatus.PUBLISHED,
  title = `Knowledge ${unique()}`,
  summary = 'Knowledge summary',
  content = '# Knowledge content',
  publishedAt,
  viewCount = 0,
  isPinned = false,
}: {
  authorId: string;
  categoryId: string;
  status?: KnowledgeStatus;
  title?: string;
  summary?: string;
  content?: string;
  publishedAt?: Date;
  viewCount?: number;
  isPinned?: boolean;
}) => {
  const knowledge = await prisma.knowledgeItem.create({
    data: {
      title,
      summary,
      content,
      status,
      categoryId,
      authorId,
      publishedAt: status === KnowledgeStatus.PUBLISHED ? (publishedAt ?? new Date()) : null,
      archivedAt: status === KnowledgeStatus.ARCHIVED ? new Date() : null,
      viewCount,
      isPinned,
    },
  });
  createdKnowledgeIds.push(knowledge.id);
  return knowledge;
};

beforeEach(() => {
  createdUserIds.length = 0;
  createdCategoryIds.length = 0;
  createdTagIds.length = 0;
  createdKnowledgeIds.length = 0;
});

afterEach(async () => {
  await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { actorId: { in: createdUserIds } },
        { targetId: { in: createdKnowledgeIds } },
      ],
    },
  });
  await prisma.notification.deleteMany({ where: { relatedId: { in: createdKnowledgeIds } } });
  await prisma.knowledgeView.deleteMany({ where: { knowledgeId: { in: createdKnowledgeIds } } });
  await prisma.knowledgeFavorite.deleteMany({ where: { knowledgeId: { in: createdKnowledgeIds } } });
  await prisma.knowledgeLike.deleteMany({ where: { knowledgeId: { in: createdKnowledgeIds } } });
  await prisma.knowledgeTag.deleteMany({
    where: {
      OR: [{ knowledgeId: { in: createdKnowledgeIds } }, { tagId: { in: createdTagIds } }],
    },
  });
  await prisma.comment.deleteMany({ where: { knowledgeId: { in: createdKnowledgeIds } } });
  await prisma.attachment.deleteMany({ where: { knowledgeId: { in: createdKnowledgeIds } } });
  await prisma.knowledgeItem.deleteMany({ where: { id: { in: createdKnowledgeIds } } });
  await prisma.tag.deleteMany({ where: { id: { in: createdTagIds } } });
  for (const categoryId of [...createdCategoryIds].reverse()) {
    await prisma.category.deleteMany({ where: { id: categoryId } });
  }
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

describe('knowledge search and home routes', () => {
  it('filters by keyword, child categories, tags, published date range, and keeps pinned items first', async () => {
    const author = await createUser(UserRole.USER);
    const rootCategory = await createCategory('Engineering');
    const childCategory = await createCategory('Frontend', rootCategory.id);
    const otherCategory = await createCategory('Operations');
    const vueTag = await createTag(`vue-${unique()}`);
    const opsTag = await createTag(`ops-${unique()}`);
    const earlyDate = new Date('2024-01-10T00:00:00.000Z');
    const laterDate = new Date('2024-02-10T00:00:00.000Z');

    const childKnowledge = await createKnowledge({
      authorId: author.id,
      categoryId: childCategory.id,
      title: 'Component Playbook',
      summary: 'Reusable UI component rules',
      content: 'Design tokens and props guidance',
      publishedAt: laterDate,
      viewCount: 10,
      isPinned: true,
    });
    const rootKnowledge = await createKnowledge({
      authorId: author.id,
      categoryId: rootCategory.id,
      title: 'Architecture Notes',
      content: 'Component ownership and review flow',
      publishedAt: earlyDate,
      viewCount: 20,
    });
    const otherKnowledge = await createKnowledge({
      authorId: author.id,
      categoryId: otherCategory.id,
      title: 'Runbook',
      content: 'Operations checklist',
      publishedAt: laterDate,
      viewCount: 30,
    });
    await prisma.knowledgeTag.createMany({
      data: [
        { knowledgeId: childKnowledge.id, tagId: vueTag.id },
        { knowledgeId: rootKnowledge.id, tagId: vueTag.id },
        { knowledgeId: otherKnowledge.id, tagId: opsTag.id },
      ],
    });

    const response = await request(app)
      .get('/api/knowledge')
      .query({
        keyword: 'component',
        categoryId: rootCategory.id,
        includeChildren: 'true',
        tagIds: vueTag.id,
        publishedFrom: '2024-01-01',
        publishedTo: '2024-12-31',
        sortBy: 'viewCount',
        sortOrder: 'desc',
      })
      .set('Authorization', authHeaderFor(author))
      .expect(200);

    expect(response.body.data.items.map((item: { id: string }) => item.id)).toEqual([childKnowledge.id, rootKnowledge.id]);
    expect(response.body.data.total).toBe(2);
  });

  it('returns home sections for pinned, latest, popular, categories, and tags', async () => {
    const author = await createUser(UserRole.USER);
    const category = await createCategory('Home Category');
    const tag = await createTag(`home-${unique()}`);
    const pinned = await createKnowledge({ authorId: author.id, categoryId: category.id, title: 'Pinned Knowledge', isPinned: true, viewCount: 5 });
    const popular = await createKnowledge({ authorId: author.id, categoryId: category.id, title: 'Popular Knowledge', viewCount: 99 });
    await prisma.knowledgeTag.createMany({
      data: [
        { knowledgeId: pinned.id, tagId: tag.id },
        { knowledgeId: popular.id, tagId: tag.id },
      ],
    });

    const response = await request(app).get('/api/knowledge/home').set('Authorization', authHeaderFor(author)).expect(200);

    expect(response.body.data.pinned.some((item: { id: string }) => item.id === pinned.id)).toBe(true);
    expect(response.body.data.latest.some((item: { id: string }) => item.id === popular.id)).toBe(true);
    expect(response.body.data.popular[0].viewCount).toBeGreaterThanOrEqual(response.body.data.popular.at(-1).viewCount);
    expect(response.body.data.categories.some((item: { id: string; knowledgeCount: number }) => item.id === category.id && item.knowledgeCount >= 2)).toBe(true);
    expect(response.body.data.tags.some((item: { id: string; knowledgeCount: number }) => item.id === tag.id && item.knowledgeCount >= 2)).toBe(true);
  });

  it('does not expose archived knowledge to normal users in list or detail pages', async () => {
    const author = await createUser(UserRole.USER);
    const otherUser = await createUser(UserRole.USER);
    const admin = await createUser(UserRole.ADMIN);
    const category = await createCategory('Archived Category');
    const archivedKnowledge = await createKnowledge({
      authorId: author.id,
      categoryId: category.id,
      title: 'Archived Internal Note',
      status: KnowledgeStatus.ARCHIVED,
      publishedAt: new Date(),
    });

    await request(app).get(`/api/knowledge/${archivedKnowledge.id}`).set('Authorization', authHeaderFor(otherUser)).expect(404);

    const userListResponse = await request(app)
      .get('/api/knowledge')
      .query({ status: KnowledgeStatus.ARCHIVED })
      .set('Authorization', authHeaderFor(otherUser))
      .expect(200);
    expect(userListResponse.body.data.items.some((item: { id: string }) => item.id === archivedKnowledge.id)).toBe(false);

    await request(app).get(`/api/knowledge/${archivedKnowledge.id}`).set('Authorization', authHeaderFor(admin)).expect(200);
  });
});

describe('knowledge CRUD routes', () => {
  it('allows a logged-in user to create, read, list, update, publish, archive, and delete own knowledge', async () => {
    const author = await createUser(UserRole.USER);
    const category = await createCategory();
    const tag = await createTag();
    const auth = authHeaderFor(author);

    const createResponse = await request(app)
      .post('/api/knowledge')
      .set('Authorization', auth)
      .send({
        title: 'Vue Component Guide',
        summary: 'How to build reusable Vue components.',
        content: '# Vue Component Guide',
        status: KnowledgeStatus.DRAFT,
        categoryId: category.id,
        tagIds: [tag.id],
      })
      .expect(201);

    const knowledge = createResponse.body.data.knowledge;
    createdKnowledgeIds.push(knowledge.id);
    expect(knowledge).toMatchObject({
      title: 'Vue Component Guide',
      status: KnowledgeStatus.DRAFT,
      category: { id: category.id },
      tags: [expect.objectContaining({ id: tag.id })],
      author: { id: author.id },
    });
    expect(knowledge.publishedAt).toBeNull();

    const detailResponse = await request(app).get(`/api/knowledge/${knowledge.id}`).set('Authorization', auth).expect(200);
    expect(detailResponse.body.data.knowledge).toMatchObject({ id: knowledge.id, content: '# Vue Component Guide' });

    const mineResponse = await request(app)
      .get('/api/knowledge')
      .query({ onlyMine: true, status: KnowledgeStatus.DRAFT })
      .set('Authorization', auth)
      .expect(200);
    expect(mineResponse.body.data.items.some((item: { id: string }) => item.id === knowledge.id)).toBe(true);

    const updateResponse = await request(app)
      .put(`/api/knowledge/${knowledge.id}`)
      .set('Authorization', auth)
      .send({
        title: 'Updated Vue Component Guide',
        summary: 'Updated summary',
        content: '# Updated',
        status: KnowledgeStatus.PUBLISHED,
        categoryId: category.id,
        tagIds: [],
      })
      .expect(200);
    expect(updateResponse.body.data.knowledge).toMatchObject({
      id: knowledge.id,
      title: 'Updated Vue Component Guide',
      status: KnowledgeStatus.PUBLISHED,
      tags: [],
    });
    expect(updateResponse.body.data.knowledge.publishedAt).toEqual(expect.any(String));

    const archiveResponse = await request(app)
      .patch(`/api/knowledge/${knowledge.id}/status`)
      .set('Authorization', auth)
      .send({ status: KnowledgeStatus.ARCHIVED })
      .expect(200);
    expect(archiveResponse.body.data.knowledge).toMatchObject({ id: knowledge.id, status: KnowledgeStatus.ARCHIVED });
    expect(archiveResponse.body.data.knowledge.archivedAt).toEqual(expect.any(String));

    await request(app).delete(`/api/knowledge/${knowledge.id}`).set('Authorization', auth).expect(200);

    const deleted = await prisma.knowledgeItem.findUnique({ where: { id: knowledge.id } });
    expect(deleted?.deletedAt).toBeTruthy();
  });

  it('enforces visibility and ownership rules for drafts and edits', async () => {
    const author = await createUser(UserRole.USER);
    const other = await createUser(UserRole.USER);
    const admin = await createUser(UserRole.ADMIN);
    const category = await createCategory();
    const draft = await createKnowledge({ authorId: author.id, categoryId: category.id, status: KnowledgeStatus.DRAFT });
    const published = await createKnowledge({ authorId: author.id, categoryId: category.id, status: KnowledgeStatus.PUBLISHED });

    await request(app).get(`/api/knowledge/${draft.id}`).set('Authorization', authHeaderFor(other)).expect(404);
    await request(app).get(`/api/knowledge/${draft.id}`).set('Authorization', authHeaderFor(admin)).expect(200);

    const listResponse = await request(app).get('/api/knowledge').set('Authorization', authHeaderFor(other)).expect(200);
    expect(listResponse.body.data.items.some((item: { id: string }) => item.id === published.id)).toBe(true);
    expect(listResponse.body.data.items.some((item: { id: string }) => item.id === draft.id)).toBe(false);

    await request(app)
      .put(`/api/knowledge/${published.id}`)
      .set('Authorization', authHeaderFor(other))
      .send({
        title: 'Forbidden edit',
        summary: 'Forbidden',
        content: 'Forbidden',
        status: KnowledgeStatus.PUBLISHED,
        categoryId: category.id,
        tagIds: [],
      })
      .expect(403);

    await request(app)
      .put(`/api/knowledge/${published.id}`)
      .set('Authorization', authHeaderFor(admin))
      .send({
        title: 'Admin edit',
        summary: 'Admin summary',
        content: 'Admin content',
        status: KnowledgeStatus.PUBLISHED,
        categoryId: category.id,
        tagIds: [],
      })
      .expect(200);
  });
});

describe('admin knowledge routes', () => {
  it('allows admins to pin knowledge and maintain category and tags', async () => {
    const author = await createUser(UserRole.USER);
    const admin = await createUser(UserRole.ADMIN);
    const category = await createCategory('Original Category');
    const nextCategory = await createCategory('Next Category');
    const firstTag = await createTag('first-tag');
    const nextTag = await createTag('next-tag');
    const knowledge = await createKnowledge({ authorId: author.id, categoryId: category.id });
    await prisma.knowledgeTag.create({ data: { knowledgeId: knowledge.id, tagId: firstTag.id } });

    const pinResponse = await request(app)
      .patch(`/api/admin/knowledge/${knowledge.id}/pin`)
      .set('Authorization', authHeaderFor(admin))
      .send({ isPinned: true })
      .expect(200);
    expect(pinResponse.body.data.knowledge).toMatchObject({ id: knowledge.id, isPinned: true });

    const categoryResponse = await request(app)
      .patch(`/api/admin/knowledge/${knowledge.id}/category`)
      .set('Authorization', authHeaderFor(admin))
      .send({ categoryId: nextCategory.id })
      .expect(200);
    expect(categoryResponse.body.data.knowledge.category).toMatchObject({ id: nextCategory.id });

    const tagsResponse = await request(app)
      .patch(`/api/admin/knowledge/${knowledge.id}/tags`)
      .set('Authorization', authHeaderFor(admin))
      .send({ tagIds: [nextTag.id] })
      .expect(200);
    expect(tagsResponse.body.data.knowledge.tags).toEqual([expect.objectContaining({ id: nextTag.id })]);

    const auditLogs = await prisma.auditLog.findMany({ where: { actorId: admin.id, targetId: knowledge.id } });
    expect(auditLogs.map((log) => log.action)).toEqual(
      expect.arrayContaining([
        AuditAction.PIN_KNOWLEDGE,
        AuditAction.UPDATE_KNOWLEDGE_CATEGORY,
        AuditAction.UPDATE_KNOWLEDGE_TAGS,
      ]),
    );

    const notifications = await prisma.notification.findMany({ where: { userId: author.id, relatedId: knowledge.id } });
    expect(notifications.length).toBeGreaterThanOrEqual(2);
  });

  it('rejects non-admin users from admin knowledge maintenance', async () => {
    const author = await createUser(UserRole.USER);
    const category = await createCategory();
    const knowledge = await createKnowledge({ authorId: author.id, categoryId: category.id });

    const response = await request(app)
      .patch(`/api/admin/knowledge/${knowledge.id}/pin`)
      .set('Authorization', authHeaderFor(author))
      .send({ isPinned: true })
      .expect(403);

    expect(response.body.code).toBe('FORBIDDEN');
  });
});
