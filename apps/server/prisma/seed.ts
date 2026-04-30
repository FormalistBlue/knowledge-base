import bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

const adminUsername = process.env.ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.ADMIN_PASSWORD ?? 'change_me_123456';
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? '管理员';

const normalizeTagName = (name: string) => name.trim().toLowerCase();

async function seedAdmin() {
  const existing = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (existing) {
    console.log(`Admin user already exists: ${adminUsername}`);
    return existing;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.create({
    data: {
      username: adminUsername,
      displayName: adminDisplayName,
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  console.log(`Created admin user: ${adminUsername}`);
  return admin;
}

async function upsertRootCategory(name: string, sortOrder: number) {
  const existing = await prisma.category.findFirst({
    where: {
      name,
      parentId: null,
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.category.create({
    data: {
      name,
      sortOrder,
    },
  });
}

async function upsertChildCategory(name: string, parentId: string, sortOrder: number) {
  const existing = await prisma.category.findFirst({
    where: {
      name,
      parentId,
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.category.create({
    data: {
      name,
      parentId,
      sortOrder,
    },
  });
}

async function seedCategories() {
  const tech = await upsertRootCategory('技术文档', 10);
  await upsertChildCategory('前端', tech.id, 10);
  await upsertChildCategory('后端', tech.id, 20);
  await upsertChildCategory('运维', tech.id, 30);

  await upsertRootCategory('操作流程', 20);
  await upsertRootCategory('规范要求', 30);
  await upsertRootCategory('产品介绍', 40);

  console.log('Seeded base categories');
}

async function seedTags(adminId: string) {
  const tagNames = ['Vue', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'];

  for (const name of tagNames) {
    await prisma.tag.upsert({
      where: { normalizedName: normalizeTagName(name) },
      update: {
        name,
        deletedAt: null,
      },
      create: {
        name,
        normalizedName: normalizeTagName(name),
        createdById: adminId,
      },
    });
  }

  console.log('Seeded base tags');
}

async function main() {
  const admin = await seedAdmin();
  await seedCategories();
  await seedTags(admin.id);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
