import { AttachmentStatus, AttachmentUsageType, KnowledgeStatus, UserRole } from '@prisma/client';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../app.js';
import { prisma } from '../../utils/prisma.js';
import { signToken } from '../auth/jwt.js';
import { hashPassword } from '../auth/password.js';
import { makeActiveCategoryKey } from '../taxonomy/taxonomy-presenter.js';

const app = createApp();
const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const authHeaderFor = (user: { id: string; role: UserRole; tokenVersion: number }) =>
  `Bearer ${signToken({ sub: user.id, role: user.role, tokenVersion: user.tokenVersion })}`;

const createdUserIds: string[] = [];
const createdCategoryIds: string[] = [];
const createdKnowledgeIds: string[] = [];
const createdAttachmentIds: string[] = [];
let uploadRoot = '';

const createUser = async (role: UserRole = UserRole.USER) => {
  const user = await prisma.user.create({
    data: {
      username: `files-${unique()}`,
      displayName: 'Files Test User',
      passwordHash: await hashPassword('Password123!'),
      role,
    },
  });
  createdUserIds.push(user.id);
  return user;
};

const createCategory = async () => {
  const name = `Files Category ${unique()}`;
  const category = await prisma.category.create({ data: { name, activeKey: makeActiveCategoryKey(null, name) } });
  createdCategoryIds.push(category.id);
  return category;
};

const createKnowledge = async (authorId: string, categoryId: string) => {
  const knowledge = await prisma.knowledgeItem.create({
    data: {
      title: `File Knowledge ${unique()}`,
      summary: 'File summary',
      content: '# File content',
      status: KnowledgeStatus.PUBLISHED,
      categoryId,
      authorId,
      publishedAt: new Date(),
    },
  });
  createdKnowledgeIds.push(knowledge.id);
  return knowledge;
};

beforeEach(async () => {
  createdUserIds.length = 0;
  createdCategoryIds.length = 0;
  createdKnowledgeIds.length = 0;
  createdAttachmentIds.length = 0;
  uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'kb-files-test-'));
  process.env.UPLOAD_DIR = uploadRoot;
});

afterEach(async () => {
  await prisma.attachment.deleteMany({
    where: {
      OR: [
        { id: { in: createdAttachmentIds } },
        { uploaderId: { in: createdUserIds } },
        { knowledgeId: { in: createdKnowledgeIds } },
      ],
    },
  });
  await prisma.knowledgeItem.deleteMany({ where: { id: { in: createdKnowledgeIds } } });
  await prisma.category.deleteMany({ where: { id: { in: createdCategoryIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  await fs.rm(uploadRoot, { recursive: true, force: true });
});

describe('file upload routes', () => {
  it('uploads an image as a temporary attachment with a safe stored filename', async () => {
    const user = await createUser();
    const response = await request(app)
      .post('/api/files/images')
      .set('Authorization', authHeaderFor(user))
      .attach('file', Buffer.from('fake png bytes'), { filename: '../unsafe demo.png', contentType: 'image/png' })
      .expect(201);

    const file = response.body.data.file;
    createdAttachmentIds.push(file.id);
    expect(file).toMatchObject({
      url: `/api/files/${file.id}/preview`,
      originalName: 'unsafe demo.png',
      mimeType: 'image/png',
      usageType: AttachmentUsageType.IMAGE,
      status: AttachmentStatus.TEMP,
    });

    const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id: file.id } });
    expect(attachment.uploaderId).toBe(user.id);
    expect(attachment.knowledgeId).toBeNull();
    expect(attachment.storedName).toMatch(/^[a-f0-9-]+\.png$/);
    expect(attachment.relativePath.includes('..')).toBe(false);
    await expect(fs.access(path.join(uploadRoot, attachment.relativePath))).resolves.toBeUndefined();
  });

  it('rejects disallowed file types for image uploads', async () => {
    const user = await createUser();
    const response = await request(app)
      .post('/api/files/images')
      .set('Authorization', authHeaderFor(user))
      .attach('file', Buffer.from('not image'), { filename: 'note.txt', contentType: 'text/plain' })
      .expect(400);

    expect(response.body).toMatchObject({ code: 'FILE_TYPE_NOT_ALLOWED' });
  });

  it('previews images and PDFs, downloads attachments, and blocks preview for Office files', async () => {
    const user = await createUser();
    const auth = authHeaderFor(user);

    const imageResponse = await request(app)
      .post('/api/files/images')
      .set('Authorization', auth)
      .attach('file', Buffer.from('image content'), { filename: 'demo.webp', contentType: 'image/webp' })
      .expect(201);
    const imageFile = imageResponse.body.data.file;
    createdAttachmentIds.push(imageFile.id);

    const imagePreviewResponse = await request(app)
      .get(`/api/files/${imageFile.id}/preview`)
      .set('Authorization', auth)
      .expect(200)
      .expect('Content-Type', /image\/webp/);
    expect(imagePreviewResponse.body.toString()).toBe('image content');

    const pdfResponse = await request(app)
      .post('/api/files/attachments')
      .set('Authorization', auth)
      .attach('file', Buffer.from('%PDF demo'), { filename: 'guide.pdf', contentType: 'application/pdf' })
      .expect(201);
    const pdfFile = pdfResponse.body.data.file;
    createdAttachmentIds.push(pdfFile.id);

    await request(app).get(`/api/files/${pdfFile.id}/preview`).set('Authorization', auth).expect(200).expect('Content-Type', /pdf/);
    await request(app)
      .get(`/api/files/${pdfFile.id}/download`)
      .set('Authorization', auth)
      .expect(200)
      .expect('Content-Disposition', /attachment/)
      .expect('Content-Disposition', /guide\.pdf/);

    const officeResponse = await request(app)
      .post('/api/files/attachments')
      .set('Authorization', auth)
      .attach('file', Buffer.from('docx'), {
        filename: 'report.docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      .expect(201);
    const officeFile = officeResponse.body.data.file;
    createdAttachmentIds.push(officeFile.id);

    await request(app).get(`/api/files/${officeFile.id}/preview`).set('Authorization', auth).expect(400);
  });

  it('binds temporary attachments when creating and updating knowledge', async () => {
    const user = await createUser();
    const category = await createCategory();
    const auth = authHeaderFor(user);
    const uploadResponse = await request(app)
      .post('/api/files/attachments')
      .set('Authorization', auth)
      .attach('file', Buffer.from('readme'), { filename: 'readme.md', contentType: 'text/markdown' })
      .expect(201);
    const attachmentId = uploadResponse.body.data.file.id;
    createdAttachmentIds.push(attachmentId);

    const createResponse = await request(app)
      .post('/api/knowledge')
      .set('Authorization', auth)
      .send({
        title: 'Knowledge with file',
        summary: 'Knowledge summary',
        content: '# Content',
        status: KnowledgeStatus.PUBLISHED,
        categoryId: category.id,
        tagIds: [],
        attachmentIds: [attachmentId],
      })
      .expect(201);
    const knowledge = createResponse.body.data.knowledge;
    createdKnowledgeIds.push(knowledge.id);
    expect(knowledge.attachments).toHaveLength(1);

    const bound = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    expect(bound).toMatchObject({ knowledgeId: knowledge.id, status: AttachmentStatus.BOUND });
    expect(bound.boundAt).toBeTruthy();
  });

  it('keeps temporary files private to their uploader before they are bound to knowledge', async () => {
    const uploader = await createUser();
    const otherUser = await createUser();
    const uploadResponse = await request(app)
      .post('/api/files/images')
      .set('Authorization', authHeaderFor(uploader))
      .attach('file', Buffer.from('private image'), { filename: 'private.png', contentType: 'image/png' })
      .expect(201);
    const fileId = uploadResponse.body.data.file.id;
    createdAttachmentIds.push(fileId);

    await request(app).get(`/api/files/${fileId}/preview`).set('Authorization', authHeaderFor(uploader)).expect(200);
    await request(app).get(`/api/files/${fileId}/preview`).set('Authorization', authHeaderFor(otherUser)).expect(404);
    await request(app).get(`/api/files/${fileId}/download`).set('Authorization', authHeaderFor(otherUser)).expect(404);
  });

  it('allows an admin to update another user knowledge without dropping existing bound attachments', async () => {
    const author = await createUser(UserRole.USER);
    const admin = await createUser(UserRole.ADMIN);
    const category = await createCategory();
    const authorAuth = authHeaderFor(author);
    const uploadResponse = await request(app)
      .post('/api/files/attachments')
      .set('Authorization', authorAuth)
      .attach('file', Buffer.from('admin keep'), { filename: 'admin-keep.md', contentType: 'text/markdown' })
      .expect(201);
    const attachmentId = uploadResponse.body.data.file.id;
    createdAttachmentIds.push(attachmentId);

    const createResponse = await request(app)
      .post('/api/knowledge')
      .set('Authorization', authorAuth)
      .send({
        title: 'Admin Editable Knowledge',
        summary: 'Knowledge summary',
        content: '# Content',
        status: KnowledgeStatus.PUBLISHED,
        categoryId: category.id,
        tagIds: [],
        attachmentIds: [attachmentId],
      })
      .expect(201);
    const knowledge = createResponse.body.data.knowledge;
    createdKnowledgeIds.push(knowledge.id);

    const updateResponse = await request(app)
      .put(`/api/knowledge/${knowledge.id}`)
      .set('Authorization', authHeaderFor(admin))
      .send({
        title: 'Admin Updated Knowledge',
        summary: 'Knowledge summary updated',
        content: '# Updated Content',
        status: KnowledgeStatus.PUBLISHED,
        categoryId: category.id,
        tagIds: [],
        attachmentIds: [attachmentId],
      })
      .expect(200);

    expect(updateResponse.body.data.knowledge.attachments).toHaveLength(1);
    const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id: attachmentId } });
    expect(attachment).toMatchObject({ knowledgeId: knowledge.id, status: AttachmentStatus.BOUND });
  });

  it('cleans temporary files older than 24 hours', async () => {
    const user = await createUser();
    const auth = authHeaderFor(user);
    const uploadResponse = await request(app)
      .post('/api/files/attachments')
      .set('Authorization', auth)
      .attach('file', Buffer.from('old temp'), { filename: 'old.txt', contentType: 'text/plain' })
      .expect(201);
    const fileId = uploadResponse.body.data.file.id;
    createdAttachmentIds.push(fileId);

    const attachment = await prisma.attachment.findUniqueOrThrow({ where: { id: fileId } });
    const absolutePath = path.join(uploadRoot, attachment.relativePath);
    await prisma.attachment.update({
      where: { id: fileId },
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const response = await request(app).post('/api/files/cleanup-temp').set('Authorization', auth).expect(200);
    expect(response.body.data.deletedCount).toBe(1);
    await expect(fs.access(absolutePath)).rejects.toThrow();
    const deleted = await prisma.attachment.findUniqueOrThrow({ where: { id: fileId } });
    expect(deleted.deletedAt).toBeTruthy();
  });

  it('requires login for upload, preview, and download', async () => {
    const user = await createUser();
    const category = await createCategory();
    const knowledge = await createKnowledge(user.id, category.id);
    const attachment = await prisma.attachment.create({
      data: {
        uploaderId: user.id,
        knowledgeId: knowledge.id,
        usageType: AttachmentUsageType.IMAGE,
        status: AttachmentStatus.BOUND,
        originalName: 'demo.png',
        storedName: 'demo.png',
        relativePath: 'demo.png',
        fileSize: 1,
        mimeType: 'image/png',
        extension: 'png',
        boundAt: new Date(),
      },
    });
    createdAttachmentIds.push(attachment.id);

    await request(app).post('/api/files/images').expect(401);
    await request(app).get(`/api/files/${attachment.id}/preview`).expect(401);
    await request(app).get(`/api/files/${attachment.id}/download`).expect(401);
  });
});
